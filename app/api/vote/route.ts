import { NextResponse } from "next/server";
import { getSupabaseAdmin, hashDni } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { dni, cand1, cand2 } = body;

    // 1. Validaciones
    if (!dni || typeof dni !== "string") {
      return NextResponse.json(
        { success: false, message: "Debe ingresar un número de DNI válido." },
        { status: 400 }
      );
    }

    const cleanDni = dni.trim().replace(/\D/g, "");
    if (cleanDni.length !== 8) {
      return NextResponse.json(
        { success: false, message: "El DNI debe tener exactamente 8 dígitos numéricos." },
        { status: 400 }
      );
    }

    if (!cand1 || !["si", "no"].includes(cand1)) {
      return NextResponse.json(
        { success: false, message: "Por favor seleccione su voto para el Candidato 1." },
        { status: 400 }
      );
    }

    if (!cand2 || !["si", "no"].includes(cand2)) {
      return NextResponse.json(
        { success: false, message: "Por favor seleccione su voto para la Candidata 2." },
        { status: 400 }
      );
    }

    // Regla electoral: No se permite ratificar con 'Sí' a ambos candidatos
    if (cand1 === "si" && cand2 === "si") {
      return NextResponse.json(
        {
          success: false,
          message: "Solo se permite ratificar con 'Sí' a un solo candidato. No es válido votar 'Sí' en ambos.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        {
          success: false,
          message:
            "La base de datos Supabase no está configurada. Por favor revisa las variables de entorno.",
        },
        { status: 500 }
      );
    }

    const dniHash = hashDni(cleanDni);
    const receiptCode =
      "JP26-" +
      Math.random().toString(36).substring(2, 6).toUpperCase() +
      "-" +
      Math.random().toString(36).substring(2, 6).toUpperCase();

    // 2. Intentar ejecutar mediante la función RPC atómica cast_vote
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("cast_vote", {
        p_dni_hash: dniHash,
        p_cand1: cand1,
        p_cand2: cand2,
        p_dni: cleanDni,
      });

      if (!rpcError && rpcData) {
        if (rpcData.success) {
          return NextResponse.json({
            success: true,
            receiptCode,
            timestamp: new Date().toISOString(),
            message: "¡Voto registrado con éxito!",
          });
        } else {
          return NextResponse.json(
            { success: false, message: rpcData.error || "No se pudo registrar el voto." },
            { status: 400 }
          );
        }
      }
    } catch {
      // Si la función RPC no existe aún, procedemos con las consultas directas como fallback
    }

    // 3. Fallback directo con tablas Supabase
    // Verificar si el DNI ya fue registrado
    const { data: existingVoter, error: checkError } = await supabase
      .from("registered_voters")
      .select("id")
      .eq("dni_hash", dniHash)
      .maybeSingle();

    if (checkError) {
      // Si la tabla no existe en Supabase aún
      if (checkError.message.includes("relation") || checkError.code === "42P01") {
        return NextResponse.json(
          {
            success: false,
            needsSetup: true,
            message:
              "Las tablas de Supabase aún no han sido creadas. Por favor ejecuta el archivo 'supabase_schema.sql' en el SQL Editor de tu panel de Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Error al verificar el DNI: " + checkError.message },
        { status: 500 }
      );
    }

    if (existingVoter) {
      return NextResponse.json(
        {
          success: false,
          message: "Este número de DNI ya ha emitido su voto en este proceso electoral.",
        },
        { status: 400 }
      );
    }

    // Registrar votante con DNI para auditoría
    const { error: insertVoterError } = await supabase
      .from("registered_voters")
      .insert({ dni_hash: dniHash, dni: cleanDni });

    if (insertVoterError) {
      if (insertVoterError.code === "23505") {
        // Unique violation
        return NextResponse.json(
          {
            success: false,
            message: "Este número de DNI ya ha emitido su voto.",
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { success: false, message: "Error al registrar el votante: " + insertVoterError.message },
        { status: 500 }
      );
    }

    // Registrar voto en la urna digital anónima (SIN vincular al DNI)
    const { error: insertVoteError } = await supabase.from("votes").insert({
      cand1_choice: cand1,
      cand2_choice: cand2,
    });

    if (insertVoteError) {
      return NextResponse.json(
        { success: false, message: "Error al depositar el voto: " + insertVoteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      receiptCode,
      timestamp: new Date().toISOString(),
      message: "¡Voto registrado con éxito!",
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: err?.message || "Ocurrió un error inesperado al procesar el voto." },
      { status: 500 }
    );
  }
}
