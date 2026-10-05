import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requiredEnv } from "../env";
export async function authClient() {
  const jar = await cookies();
  return createServerClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(items) {
        try { items.forEach(({name,value,options}) => jar.set(name,value,options)); }
        catch { /* Server Components cannot write cookies; proxy refreshes them. */ }
      },
    },
  });
}
