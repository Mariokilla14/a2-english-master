
import { rpc } from "./_supabase.js";

export default async function handler(req, res) {
  try {
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(401).json({ error: "Login richiesto" });

    if (req.method === "GET") {
      const topic = req.query?.topic || null;
      const grammar = req.query?.grammar || null;
      const data = await rpc("get_random_fillgap_exercise", {
        p_session_id: sessionId,
        p_topic: topic,
        p_grammar: grammar
      });
      if (!data?.ok) return res.status(404).json({ error: data?.error || "Nessun esercizio cloud" });
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { exercise } = req.body || {};
      if (!exercise) return res.status(400).json({ error: "Esercizio mancante" });
      const data = await rpc("save_fillgap_exercise", {
        p_session_id: sessionId,
        p_exercise: exercise
      });
      if (!data?.ok) return res.status(400).json({ error: data?.error || "Salvataggio non riuscito" });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: "Use GET or POST" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "FillGap cloud failed" });
  }
}
