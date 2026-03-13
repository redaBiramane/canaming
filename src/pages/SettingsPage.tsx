import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { LogOut, Shield, User } from "lucide-react";

export default function SettingsPage() {
  const { user, role, signOut } = useAuth();

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
            <p><strong className="text-foreground">CA Naming Studio</strong> v1.0</p>
            <p>Plateforme de normalisation des noms de colonnes SQL</p>
            <p>Crédit Agricole — Équipe Data / BI</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
