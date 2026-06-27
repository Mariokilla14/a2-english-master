
import { rpc } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(401).json({ error: "Login richiesto" });

    if (req.method === "GET") {
      const limit = Number(req.query?.limit || 50);
      const data = await rpc("list_fillgap_archive", {
        p_session_id: sessionId,
        p_limit: limit
      });
      if (!data?.ok) return res.status(400).json({ error: data?.error || "Archivio non disponibile" });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { exercise } = req.body || {};
      if (!exercise) return res.status(400).json({ error: "Esercizio mancante" });
      const data = await rpc("save_fillgap_archive", {
        p_session_id: sessionId,
        p_exercise: exercise
      });
      if (!data?.ok) return res.status(400).json({ error: data?.error || "Salvataggio non riuscito" });
      return res.status(200).json(data);
    }

    if (req.method === "PATCH") {
      const { archiveId, answers, score, total, timeSeconds, favorite } = req.body || {};
      if (favorite && archiveId) {
        const data = await rpc("toggle_fillgap_favorite", {
          p_session_id: sessionId,
          p_archive_id: archiveId
        });
        if (!data?.ok) return res.status(400).json({ error: data?.error || "Preferito non salvato" });
        return res.status(200).json(data);
      }

      const data = await rpc("update_fillgap_archive_result", {
        p_session_id: sessionId,
        p_archive_id: archiveId,
        p_answers: answers || {},
        p_score: Number(score || 0),
        p_total: Number(total || 0),
        p_time_seconds: timeSeconds == null ? null : Number(timeSeconds)
      });
      if (!data?.ok) return res.status(400).json({ error: data?.error || "Risultato non salvato" });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Use GET, POST or PATCH" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Archive failed" });
  }
}
