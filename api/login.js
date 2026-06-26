
import { rpc, getClientInfo } from "./_supabase.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  try {
    const { username, password, deviceId, browser, os } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: "Username e password obbligatori" });

    const { ua, ip } = getClientInfo(req);
    const data = await rpc("login_user", {
      p_username: username,
      p_password: password,
      p_device_id: deviceId || "DEV-UNKNOWN",
      p_browser: browser || "Unknown",
      p_os: os || "Unknown",
      p_user_agent: ua,
      p_ip: ip
    });

    if (!data?.ok) return res.status(401).json({ error: data?.error || "Login non valido" });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message || "Login failed" });
  }
}
