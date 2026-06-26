
import { rpc } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(401).json({ error: "Login richiesto" });

    if (req.method === "POST") {
      const { kind, title, content } = req.body || {};
      const data = await rpc("save_user_note", {
        p_session_id: sessionId,
        p_kind: kind || "note",
        p_title: title || "",
        p_content: content || {}
      });
      if (!data?.ok) return res.status(400).json({ error: data?.error || "Errore salvataggio" });
      return res.status(200).json(data);
    }

    if (req.method === "GET") {
      const kind = req.query?.kind || null;
      const data = await rpc("list_user_notes", { p_session_id: sessionId, p_kind: kind });
      if (!data?.ok) return res.status(400).json({ error: data?.error || "Errore lettura" });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Use GET or POST" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Cloud note failed" });
  }
}
