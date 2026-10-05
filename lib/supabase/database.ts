import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "../env";
// This key bypasses RLS. Import this module only in server code; authorize every mutation.
export function database() {
  return createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
