import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { mot, contexte, auteur } = req.body || {};
  if (!mot) return res.status(400).json({ error: "Missing 'mot'" });

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return res.status(500).json({ error: "RESEND_API_KEY not configured" });

  // Fetch notification emails from app_settings
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return res.status(500).json({ error: "Supabase not configured" });

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: setting } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "notification_emails")
    .maybeSingle();

  let emails: string[] = [];
  if (setting?.value) {
    try {
      emails = JSON.parse(setting.value);
    } catch { /* ignore */ }
  }

  if (emails.length === 0) {
    return res.status(200).json({ sent: false, reason: "No notification emails configured" });
  }

  // Build email HTML
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">🚩 Nouveau signalement</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 4px 0 0; font-size: 14px;">Naming Studio — Alerte automatique</p>
      </div>
      <div style="background: #f8fafc; padding: 24px 32px; border: 1px solid #e2e8f0; border-top: none;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; width: 120px;">Mot signalé</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-weight: 600; font-size: 15px; color: #1e293b;">
              <code style="background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 4px;">${mot}</code>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px;">Contexte</td>
            <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #334155;">
              <code style="background: #f1f5f9; padding: 2px 6px; border-radius: 3px;">${contexte || "—"}</code>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #64748b; font-size: 13px;">Signalé par</td>
            <td style="padding: 12px 0; font-size: 14px; color: #334155;">${auteur || "utilisateur"}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; text-align: center;">
          <a href="https://fieldmapper.space/signalements" 
             style="display: inline-block; background: #6366f1; color: white; padding: 10px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Voir les signalements →
          </a>
        </div>
      </div>
      <div style="padding: 16px 32px; text-align: center; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: white;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8;">
          Cet email a été envoyé automatiquement par Naming Studio.<br/>
          Gérez les destinataires dans Paramètres → Emails de notification.
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "Naming Studio <onboarding@resend.dev>",
        to: emails,
        subject: `🚩 Signalement: "${mot}" — Naming Studio`,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Resend error:", result);
      return res.status(500).json({ sent: false, error: result });
    }

    return res.status(200).json({ sent: true, to: emails, id: result.id });
  } catch (err: any) {
    console.error("Email send error:", err);
    return res.status(500).json({ sent: false, error: err.message });
  }
}
