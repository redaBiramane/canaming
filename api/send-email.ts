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

  // Build email HTML — Crédit Agricole brand colors
  const now = new Date().toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <!-- Header with CA Green -->
      <div style="background: linear-gradient(135deg, #006A4E 0%, #1B6B37 50%, #2D8B4E 100%); padding: 28px 32px; border-radius: 12px 12px 0 0;">
        <table style="width: 100%;" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.3px;">🚩 Nouveau signalement</h1>
              <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0; font-size: 13px; font-weight: 400;">Naming Studio — Alerte automatique</p>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 6px 12px; display: inline-block;">
                <span style="color: white; font-size: 11px; font-weight: 500;">${now}</span>
              </div>
            </td>
          </tr>
        </table>
      </div>

      <!-- Body -->
      <div style="background: #fafbfc; padding: 28px 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
        <!-- Alert badge -->
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px;">
          <p style="margin: 0; font-size: 13px; color: #065F46;">
            ⚠️ Un mot absent du dictionnaire a été signalé et nécessite votre validation.
          </p>
        </div>

        <!-- Details card -->
        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 14px 20px; border-bottom: 1px solid #f0f0f0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; width: 130px; font-weight: 600;">Mot signalé</td>
              <td style="padding: 14px 20px; border-bottom: 1px solid #f0f0f0;">
                <code style="background: #FEE2E2; color: #DC2626; padding: 4px 12px; border-radius: 6px; font-size: 14px; font-weight: 700; letter-spacing: 0.3px;">${mot}</code>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px 20px; border-bottom: 1px solid #f0f0f0; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Contexte de transformation</td>
              <td style="padding: 14px 20px; border-bottom: 1px solid #f0f0f0; font-size: 13px; color: #374151;">
                <code style="background: #F3F4F6; padding: 3px 10px; border-radius: 4px; font-family: 'Courier New', monospace;">${contexte || "—"}</code>
              </td>
            </tr>
            <tr>
              <td style="padding: 14px 20px; color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Signalé par</td>
              <td style="padding: 14px 20px; font-size: 13px; color: #374151; font-weight: 500;">${auteur || "utilisateur"}</td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <div style="margin-top: 24px; text-align: center;">
          <a href="https://fieldmapper.space/signalements" 
             style="display: inline-block; background: linear-gradient(135deg, #006A4E, #1B6B37); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; letter-spacing: 0.2px; box-shadow: 0 2px 8px rgba(0,106,78,0.3);">
            Voir les signalements →
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 18px 32px; text-align: center; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #f9fafb;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #9CA3AF;">
          Cet email a été envoyé automatiquement par <strong style="color: #006A4E;">Naming Studio</strong>
        </p>
        <p style="margin: 0; font-size: 11px; color: #9CA3AF;">
          Gérez les destinataires dans Paramètres → Emails de notification
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
