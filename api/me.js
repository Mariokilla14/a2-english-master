
import { rpc } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(401).json({ error: "Login richiesto" });

    const data = await rpc("get_session_user", { p_session_id: sessionId });
    if (!data?.ok) return res.status(401).json({ error: data?.error || "Sessione non valida" });

    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Session failed" });
  }
}
