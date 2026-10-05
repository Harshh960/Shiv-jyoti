import "server-only";
export function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value || value.startsWith("YOUR_") || value.includes("your-project")) throw new Error(`Missing configuration: ${key}`);
  return value;
}
export function authConfigured() { return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY); }
