import { motion } from "framer-motion";
import { useAppStore } from "@/hooks/useStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function SettingsPage() {
  const { role, setRole } = useAppStore();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de l'application</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card p-6 space-y-6">
        <div>
          <h2 className="font-semibold text-foreground mb-4">Rôle utilisateur</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-foreground">Mode administrateur</Label>
              <p className="text-sm text-muted-foreground">
                Active les fonctionnalités d'administration du dictionnaire
              </p>
            </div>
            <Switch
              checked={role === "admin"}
              onCheckedChange={(checked) => {
                setRole(checked ? "admin" : "user");
                toast.success(checked ? "Mode administrateur activé" : "Mode utilisateur activé");
              }}
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">Données</h2>
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
              Remet le dictionnaire, l'historique et les compteurs à leur état initial.
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="font-semibold text-foreground mb-4">À propos</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong className="text-foreground">CA Naming Studio</strong> v1.0</p>
            <p>Plateforme de normalisation des noms de colonnes SQL</p>
            <p>Crédit Agricole — Équipe Data / BI</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
