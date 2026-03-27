import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { LogOut, Shield, User, Sparkles, Eye, EyeOff, CheckCircle2, XCircle, Save } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { user, role, signOut } = useAuth();
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();

  // API Key state
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch current API key (admin only)
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

  useEffect(() => {
    if (currentApiKey) {
      setApiKeyInput(currentApiKey);
    }
  }, [currentApiKey]);

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast.error("Saisissez une clé API");
      return;
    }
    setSaving(true);
    try {
      // Upsert the API key
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "openai_api_key", value: apiKeyInput.trim(), updated_at: new Date().toISOString() }, { onConflict: "key" });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["app_settings", "openai_api_key"] });
      toast.success("Clé API OpenAI sauvegardée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const deleteApiKey = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .delete()
        .eq("key", "openai_api_key");
      if (error) throw error;
      setApiKeyInput("");
      queryClient.invalidateQueries({ queryKey: ["app_settings", "openai_api_key"] });
      toast.success("Clé API supprimée");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de l'application</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-foreground mb-4">Mon compte</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-foreground">{user?.email}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  {role === "admin" ? <Shield className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  {role === "admin" ? "Administrateur" : "Utilisateur"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Key Section (Admin only) */}
        {isAdmin && (
          <div className="border-t pt-6">
            <h2 className="font-semibold text-foreground mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Configuration IA (OpenAI)
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Configurez la clé API OpenAI pour activer la fonctionnalité IA Naming pour tous les utilisateurs.
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Statut :</span>
                {loadingKey ? (
                  <span className="text-xs text-muted-foreground">Chargement…</span>
                ) : currentApiKey ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Configurée
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium">
                    <XCircle className="h-3.5 w-3.5" /> Non configurée
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10 font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={saveApiKey} disabled={saving} className="gap-1">
                  <Save className="h-4 w-4" /> Sauvegarder
                </Button>
              </div>
              {currentApiKey && (
                <Button variant="outline" size="sm" onClick={deleteApiKey} disabled={saving} className="text-destructive hover:text-destructive gap-1">
                  <XCircle className="h-3.5 w-3.5" /> Supprimer la clé
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Obtenez votre clé sur <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline text-primary hover:text-primary/80">platform.openai.com</a>. 
                Modèle utilisé : gpt-4o-mini.
              </p>
            </div>
          </div>
        )}

        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">Données locales</h2>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem("ca-naming-studio");
                window.location.reload();
              }}
            >
              Réinitialiser les données par défaut
            </Button>
            <p className="text-xs text-muted-foreground">
              Remet le dictionnaire local, l'historique et les compteurs à leur état initial.
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">Session</h2>
          <Button variant="destructive" onClick={signOut} className="gap-2">
            <LogOut className="h-4 w-4" /> Se déconnecter
          </Button>
        </div>

        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">À propos</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">CA Naming Studio</strong> v1.1</p>
            <p>Plateforme de normalisation des noms de colonnes SQL</p>
            <p>Crédit Agricole — Équipe Data / BI</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
