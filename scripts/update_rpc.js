const { Client } = require("pg");

const connectionString =
  "postgresql://postgres.ezardknnyjxikrkggwmh:bPd1aYIxF6g3kDQ1@aws-0-ca-central-1.pooler.supabase.com:6543/postgres";

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function updateRpc() {
  await client.connect();
  const sql = `
    CREATE OR REPLACE FUNCTION public.cast_vote(
        p_dni_hash TEXT,
        p_cand1 TEXT,
        p_cand2 TEXT,
        p_dni TEXT DEFAULT NULL
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_exists BOOLEAN;
    BEGIN
        -- Validar opciones permitidas
        IF p_cand1 NOT IN ('si', 'no') OR p_cand2 NOT IN ('si', 'no') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Opción de voto no válida.');
        END IF;

        IF p_cand1 = 'si' AND p_cand2 = 'si' THEN
            RETURN jsonb_build_object('success', false, 'error', 'No está permitido ratificar con Sí a ambos candidatos.');
        END IF;

        -- Validar si el DNI ya emitió su voto
        SELECT EXISTS(SELECT 1 FROM public.registered_voters WHERE dni_hash = p_dni_hash) INTO v_exists;
        IF v_exists THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este DNI ya ha emitido su voto.');
        END IF;

        -- Registrar votante para auditoría (padrón de participación, sin vincular voto)
        INSERT INTO public.registered_voters (dni_hash, dni) VALUES (p_dni_hash, p_dni);

        -- Depositar voto en la urna digital (completamente anónimo)
        INSERT INTO public.votes (cand1_choice, cand2_choice) VALUES (p_cand1, p_cand2);

        RETURN jsonb_build_object('success', true);
    EXCEPTION
        WHEN unique_violation THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este DNI ya ha emitido su voto.');
        WHEN OTHERS THEN
            RETURN jsonb_build_object('success', false, 'error', SQLERRM);
    END;
    $$;
  `;
  await client.query(sql);
  console.log("RPC cast_vote updated with p_dni audit support!");
  await client.end();
}

updateRpc();
