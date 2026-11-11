-- ============================================================
-- PROCESO ELECTORAL JIAPENG 2026
-- Esquema de Base de Datos para Votación Anónima y Segura
-- ============================================================

-- 1. Tabla de Registro de Votantes (Solo almacena hash de DNI para evitar votos duplicados)
CREATE TABLE IF NOT EXISTS public.registered_voters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dni_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índice para búsquedas ultrarrápidas de DNI
CREATE INDEX IF NOT EXISTS idx_voters_dni_hash ON public.registered_voters(dni_hash);

-- 2. Tabla de Cédulas de Votación (Urna Digital Anónima)
-- ¡IMPORTANTE!: Esta tabla NO contiene llaves foráneas, ni referencias al DNI, ni IP.
-- Es completamente anónima y desacoplada del votante.
CREATE TABLE IF NOT EXISTS public.votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cand1_choice TEXT NOT NULL CHECK (cand1_choice IN ('si', 'no')),
    cand2_choice TEXT NOT NULL CHECK (cand2_choice IN ('si', 'no')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.registered_voters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Permitir lectura y escritura a service_role (usado por Next.js API Routes de forma segura)
DROP POLICY IF EXISTS "Service role can do all on registered_voters" ON public.registered_voters;
CREATE POLICY "Service role can do all on registered_voters" 
ON public.registered_voters FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can do all on votes" ON public.votes;
CREATE POLICY "Service role can do all on votes" 
ON public.votes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Permitir lectura pública de votos (solo para conteo de resultados en tiempo real)
DROP POLICY IF EXISTS "Allow public read of votes for tally" ON public.votes;
CREATE POLICY "Allow public read of votes for tally" 
ON public.votes FOR SELECT TO anon USING (true);

-- 4. Función Transaccional Atómica para Emitir Voto
-- Garantiza que el registro del votante y el depósito del voto ocurran en una sola transacción
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
    -- Validar opciones permitidas
    IF p_cand1 NOT IN ('si', 'no') OR p_cand2 NOT IN ('si', 'no') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Opción de voto no válida.');
    END IF;

    -- Validar si el DNI ya emitió su voto
    SELECT EXISTS(SELECT 1 FROM public.registered_voters WHERE dni_hash = p_dni_hash) INTO v_exists;
    IF v_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este DNI ya ha emitido su voto.');
    END IF;

    -- Registrar votante (impide que vuelva a votar)
    INSERT INTO public.registered_voters (dni_hash) VALUES (p_dni_hash);

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

-- 5. Función para Obtener Resultados Agregados Oficiales
CREATE OR REPLACE FUNCTION public.get_election_results()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total INTEGER;
    v_c1_si INTEGER;
    v_c1_no INTEGER;
    v_c2_si INTEGER;
    v_c2_no INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.votes;
    SELECT COUNT(*) FILTER (WHERE cand1_choice = 'si') INTO v_c1_si FROM public.votes;
    SELECT COUNT(*) FILTER (WHERE cand1_choice = 'no') INTO v_c1_no FROM public.votes;
    SELECT COUNT(*) FILTER (WHERE cand2_choice = 'si') INTO v_c2_si FROM public.votes;
    SELECT COUNT(*) FILTER (WHERE cand2_choice = 'no') INTO v_c2_no FROM public.votes;

    RETURN jsonb_build_object(
        'total_votes', COALESCE(v_total, 0),
        'cand1', jsonb_build_object('si', COALESCE(v_c1_si, 0), 'no', COALESCE(v_c1_no, 0)),
        'cand2', jsonb_build_object('si', COALESCE(v_c2_si, 0), 'no', COALESCE(v_c2_no, 0))
    );
END;
$$;

-- Dar permisos de ejecución a anon y authenticated
GRANT EXECUTE ON FUNCTION public.cast_vote(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_election_results() TO anon, authenticated, service_role;
