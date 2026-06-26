
import { rpc } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const sessionId = req.headers["x-session-id"];
    if (!sessionId) return res.status(401).json({ error: "Login richiesto" });

    const {
      type, userId, sessionTargetId, enabled, blocked,
      username, password, role, teacherLimit, fillgapLimit, emailLimit
    } = req.body || {};

    let data;

    if (type === "user_enabled") {
      data = await rpc("admin_set_user_enabled", {
        p_session_id: sessionId,
        p_user_id: userId,
        p_enabled: !!enabled
      });
    } else if (type === "session_blocked") {
      data = await rpc("admin_set_session_blocked", {
        p_session_id: sessionId,
        p_target_session_id: sessionTargetId,
        p_blocked: !!blocked
      });
    } else if (type === "create_user") {
      data = await rpc("admin_create_user", {
        p_session_id: sessionId,
        p_username: username,
        p_password: password,
        p_role: role || "basic",
        p_teacher_limit: teacherLimit ?? null,
        p_fillgap_limit: fillgapLimit ?? null,
        p_email_limit: emailLimit ?? null
      });
    } else if (type === "update_plan") {
      data = await rpc("admin_update_user_plan", {
        p_session_id: sessionId,
        p_user_id: userId,
        p_role: role || "basic",
        p_teacher_limit: teacherLimit ?? null,
        p_fillgap_limit: fillgapLimit ?? null,
        p_email_limit: emailLimit ?? null
      });
    } else if (type === "reset_usage") {
      data = await rpc("admin_reset_usage", {
        p_session_id: sessionId,
        p_user_id: userId
      });
    } else {
      return res.status(400).json({ error: "Azione non valida" });
    }

    if (!data?.ok) return res.status(403).json({ error: data?.error || "Non autorizzato" });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Admin action failed" });
  }
}
