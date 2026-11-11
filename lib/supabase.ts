import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Cliente para el frontend / público
export const supabasePublic = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder"
);

// Cliente de backend con Service Role (máxima seguridad para API Routes)
export const getSupabaseAdmin = () => {
  const key = supabaseServiceRoleKey || supabaseAnonKey;
  if (!supabaseUrl || !key) {
    return null;
  }
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

/**
 * Genera un hash criptográfico SHA-256 con salt del DNI.
 * De esta forma, el DNI nunca se almacena en texto plano en la base de datos,
 * garantizando la total privacidad del votante mientras impide el doble voto.
 */
export function hashDni(dni: string): string {
  const salt = process.env.VOTING_SALT || "JIAPENG_COMITE_2026_SECRET_SALT_PERU";
  const cleanDni = dni.trim().replace(/\D/g, "");
  return crypto.createHash("sha256").update(`${cleanDni}_${salt}`).digest("hex");
}
