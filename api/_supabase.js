
export function sbConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY on Vercel");
  return { url, key };
}

export async function rpc(name, body) {
  const { url, key } = sbConfig();
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": key,
      "Authorization": `Bearer ${key}`
    },
    body: JSON.stringify(body || {})
  });

  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!response.ok) {
    throw new Error(typeof data === "string" ? data : (data?.message || "Supabase error"));
  }

  return data;
}

export async function incrementUsage(req, action) {
  const sessionId = req.headers["x-session-id"];
  if (!sessionId) {
    const err = new Error("Login richiesto");
    err.status = 401;
    throw err;
  }

  const data = await rpc("increment_usage", { p_session_id: sessionId, p_action: action });
  if (!data?.ok) {
    const err = new Error(data?.error || "Limite raggiunto");
    err.status = 403;
    throw err;
  }
  return data;
}

export function getClientInfo(req) {
  const ua = req.headers["user-agent"] || "";
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.headers["x-real-ip"] || "";
  return { ua, ip };
}
