import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const adminCodeHeader = req.headers.get("x-admin-code");
    const adminCode = body.adminCode || adminCodeHeader;

    const expectedAdminCode = process.env.ADMIN_SECRET_CODE || "JIAPENG2026";

    // Validar autorización del administrador
    if (!adminCode || adminCode.trim() !== expectedAdminCode.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Acceso no autorizado. Código de administrador incorrecto.",
        },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json(
        { success: false, message: "Supabase no está configurado." },
        { status: 500 }
      );
    }

    // 1. Intentar obtener resultados mediante función RPC
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_election_results");
      if (!rpcError && rpcData) {
        return NextResponse.json({
          success: true,
          data: rpcData,
        });
      }
    } catch {
      // Continuar con fallback si RPC no está disponible
    }

    // 2. Consulta directa a la tabla de votos
    const { data: votes, error: votesError } = await supabase
      .from("votes")
      .select("cand1_choice, cand2_choice");

    if (votesError) {
      if (votesError.message.includes("relation") || votesError.code === "42P01") {
        return NextResponse.json(
          {
            success: false,
            needsSetup: true,
            message: "La tabla de votos no existe todavía en Supabase.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { success: false, message: votesError.message },
        { status: 500 }
      );
    }

    const total = votes.length;
    const c1_si = votes.filter((v) => v.cand1_choice === "si").length;
    const c1_no = votes.filter((v) => v.cand1_choice === "no").length;
    const c2_si = votes.filter((v) => v.cand2_choice === "si").length;
    const c2_no = votes.filter((v) => v.cand2_choice === "no").length;

    return NextResponse.json({
      success: true,
      data: {
        total_votes: total,
        cand1: {
          si: c1_si,
          no: c1_no,
        },
        cand2: {
          si: c2_si,
          no: c2_no,
        },
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, message: err?.message || "Error al obtener resultados" },
      { status: 500 }
    );
  }
}
