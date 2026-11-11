import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";

export const isSupabaseConfigured = Boolean(rawSupabaseUrl && rawSupabaseAnonKey);

export const supabase = createClient(
  rawSupabaseUrl || "http://127.0.0.1:54321",
  rawSupabaseAnonKey || "public-anon-placeholder-disabled",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export default supabase;
