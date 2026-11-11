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

    // 1. Obtener votos de la urna digital anónima
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

    const total = votes ? votes.length : 0;
    const c1_si = votes ? votes.filter((v) => v.cand1_choice === "si").length : 0;
    const c1_no = votes ? votes.filter((v) => v.cand1_choice === "no").length : 0;
    const c2_si = votes ? votes.filter((v) => v.cand2_choice === "si").length : 0;
    const c2_no = votes ? votes.filter((v) => v.cand2_choice === "no").length : 0;

    // 2. Obtener lista de votantes para el padrón de auditoría del Administrador
    const { data: voterRecords, error: votersError } = await supabase
      .from("registered_voters")
      .select("dni, created_at")
      .order("created_at", { ascending: false });

    if (votersError) {
      console.error("Error al obtener padron de votantes:", votersError);
    }

    const formattedVoters = (voterRecords || []).map((v) => ({
      dni: v.dni || "DNI registrado",
      created_at: v.created_at,
    }));

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
        voters: formattedVoters,
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
