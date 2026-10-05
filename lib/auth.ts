import "server-only";
import { authClient } from "./supabase/server";
import { authConfigured } from "./env";
export async function getOwner() {
  if (!authConfigured() || !process.env.ADMIN_EMAIL?.trim()) return null;
  const supabase = await authClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return null;
  return user.email?.toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase() ? user : null;
}
