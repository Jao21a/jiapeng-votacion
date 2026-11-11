const { Client } = require("pg");

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error("Error: Se requiere definir DATABASE_URL en las variables de entorno.");
  process.exit(1);
}

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
        p_cand2 TEXT
    )
    RETURNS jsonb
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
        v_exists BOOLEAN;
    BEGIN
        IF p_cand1 NOT IN ('si', 'no') OR p_cand2 NOT IN ('si', 'no') THEN
            RETURN jsonb_build_object('success', false, 'error', 'Opción de voto no válida.');
        END IF;

        IF p_cand1 = 'si' AND p_cand2 = 'si' THEN
            RETURN jsonb_build_object('success', false, 'error', 'No está permitido ratificar con Sí a ambos candidatos.');
        END IF;

        SELECT EXISTS(SELECT 1 FROM public.registered_voters WHERE dni_hash = p_dni_hash) INTO v_exists;
        IF v_exists THEN
            RETURN jsonb_build_object('success', false, 'error', 'Este DNI ya ha emitido su voto.');
        END IF;

        INSERT INTO public.registered_voters (dni_hash) VALUES (p_dni_hash);
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
  console.log("RPC cast_vote actualizada con validación.");
  await client.end();
}

updateRpc();
