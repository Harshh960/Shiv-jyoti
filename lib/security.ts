export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const allowed = new Set([new URL(request.url).origin]);
    if (process.env.APP_URL) allowed.add(new URL(process.env.APP_URL).origin);
    return allowed.has(new URL(origin).origin) && new URL(origin).origin === origin;
  } catch { return false; }
}
