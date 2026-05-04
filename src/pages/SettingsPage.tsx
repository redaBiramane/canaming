import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Save, LogOut, Shield, User, Sparkles, Eye, EyeOff, CheckCircle2, XCircle, Mail, Plus, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useI18nStore } from "@/lib/i18n";

export default function SettingsPage() {
  const { user, role, signOut } = useAuth();
  const { t } = useI18nStore();
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  const { data: currentApiKey, isLoading: loadingKey } = useQuery({
    queryKey: ["app_settings", "openai_api_key"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "openai_api_key")
        .single();
      if (error) return null;
      return data?.value || null;
    },
    enabled: isAdmin,
  });

  const { data: notifEmails = [], isLoading: loadingEmails } = useQuery({
    queryKey: ["app_settings", "notification_emails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "notification_emails")
        .maybeSingle();
      if (error || !data?.value) return [];
      try { return JSON.parse(data.value) as string[]; } catch { return []; }
    },
    enabled: isAdmin,
  });

  useEffect(() => {
    if (currentApiKey) setApiKeyInput(currentApiKey);
  }, [currentApiKey]);

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) { toast.error(t("settings.toast_no_api_key")); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "openai_api_key", value: apiKeyInput.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["app_settings", "openai_api_key"] });
      toast.success(t("settings.toast_api_key_saved"));
    } catch (err: any) {
      toast.error(err.message || t("admin.toast_error"));
    } finally { setSaving(false); }
  };

  const deleteApiKey = async () => {
    setSaving(true);
    try {
      await supabase.from("app_settings").delete().eq("key", "openai_api_key");
      setApiKeyInput("");
      queryClient.invalidateQueries({ queryKey: ["app_settings", "openai_api_key"] });
      toast.success(t("settings.toast_api_key_deleted"));
    } catch (err: any) {
      toast.error(err.message || t("admin.toast_error"));
    } finally { setSaving(false); }
  };

  const saveEmailList = async (emails: string[]) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "notification_emails", value: JSON.stringify(emails), updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ["app_settings", "notification_emails"] });
  };

  const addEmail = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast.error(t("settings.email_invalid")); return; }
    if (notifEmails.includes(email)) { toast.error(t("settings.email_exists")); return; }
    try {
      await saveEmailList([...notifEmails, email]);
      setNewEmail("");
      toast.success(t("settings.email_saved"));
    } catch (err: any) { toast.error(err.message || t("admin.toast_error")); }
  };

  const removeEmail = async (email: string) => {
    try {
      await saveEmailList(notifEmails.filter((e: string) => e !== email));
      toast.success(t("settings.email_saved"));
    } catch (err: any) { toast.error(err.message || t("admin.toast_error")); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("settings.subtitle")}</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card p-6 space-y-6">
        {/* Account */}
        <div>
          <h2 className="font-semibold text-foreground mb-4">{t("settings.my_account")}</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">{user?.email?.[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="font-medium text-foreground">{user?.email}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                {role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                {role === "admin" ? t("settings.role_admin") : t("settings.role_user")}
              </p>
            </div>
          </div>
        </div>

        {/* AI Config (Admin) */}
        {isAdmin && (
          <div className="border-t pt-6">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> {t("settings.ai_config_title")}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">{t("settings.ai_config_desc")}</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">{t("settings.status_label")}</span>
                {loadingKey ? (
                  <span className="text-xs text-muted-foreground">{t("settings.loading")}</span>
                ) : currentApiKey ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t("settings.configured")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                    <XCircle className="h-3.5 w-3.5" /> {t("settings.not_configured")}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input type={showKey ? "text" : "password"} value={apiKeyInput} onChange={(e) => setApiKeyInput(e.target.value)} placeholder="sk-..." className="pr-10 font-mono text-sm" />
                  <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={saveApiKey} disabled={saving} className="gap-1">
                  <Save className="h-4 w-4" /> {t("settings.save_btn")}
                </Button>
              </div>
              {currentApiKey && (
                <Button variant="outline" size="sm" onClick={deleteApiKey} disabled={saving} className="text-destructive hover:text-destructive gap-1">
                  <XCircle className="h-3.5 w-3.5" /> {t("settings.delete_key")}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {t("settings.get_key_link")} <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">platform.openai.com</a>. {t("settings.model_used")}
              </p>
            </div>
          </div>
        )}

        {/* Email Notifications (Admin) */}
        {isAdmin && (
          <div className="border-t pt-6">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" /> {t("settings.email_notif_title")}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">{t("settings.email_notif_desc")}</p>
            <div className="space-y-3">
              {notifEmails.length === 0 && !loadingEmails ? (
                <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border border-dashed">
                  {t("settings.email_list_empty")}
                </p>
              ) : (
                <div className="space-y-2">
                  {notifEmails.map((email: string) => (
                    <div key={email} className="flex items-center justify-between bg-muted/30 border rounded-lg px-3 py-2 group">
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-mono text-foreground">{email}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeEmail(email)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder={t("settings.email_add_placeholder")} className="font-mono text-sm" onKeyDown={(e) => e.key === "Enter" && addEmail()} />
                <Button onClick={addEmail} className="gap-1" size="sm">
                  <Plus className="h-3.5 w-3.5" /> {t("settings.email_add_btn")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Local Data */}
        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">{t("settings.local_data")}</h2>
          <div className="space-y-3">
            <Button variant="outline" onClick={() => { localStorage.removeItem("ca-naming-studio"); window.location.reload(); }}>
              {t("settings.reset_data_btn")}
            </Button>
            <p className="text-xs text-muted-foreground">{t("settings.reset_data_desc")}</p>
          </div>
        </div>

        {/* Session */}
        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">{t("settings.session")}</h2>
          <Button variant="destructive" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> {t("settings.logout")}
          </Button>
        </div>

        {/* About */}
        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">{t("settings.about")}</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">CA Naming Studio</strong> v1.2</p>
            <p>{t("settings.about_desc")}</p>
            <p>{t("settings.about_team")}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
