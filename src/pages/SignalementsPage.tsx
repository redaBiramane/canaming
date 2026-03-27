import { useState } from "react";
import { motion } from "framer-motion";
import {
  Flag, Plus, XCircle, CheckCircle2, Clock, Search, Filter, Check, Download,
} from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Signalement } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIES = ["Général", "Finance", "RH", "Commercial", "Civil", "Contact", "Géographie", "Structure", "Juridique", "Technique"];

const statusConfig = {
  en_attente: { label: "En attente", icon: Clock, className: "ca-badge-warning" },
  traité: { label: "Traité", icon: CheckCircle2, className: "ca-badge-ok" },
  rejeté: { label: "Rejeté", icon: XCircle, className: "ca-badge-error" },
};

interface FormData {
  terme_source: string;
  abreviation: string;
  description: string;
  synonymes: string;
  categorie: string;
}

const emptyForm: FormData = { terme_source: "", abreviation: "", description: "", synonymes: "", categorie: "Général" };

export default function SignalementsPage() {
  const { signalements, addEntry, updateSignalement } = useAppStore();
  const { role, user } = useAuth();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [currentSignalementId, setCurrentSignalementId] = useState<string | null>(null);

  const isAdmin = role === "admin";

  // Users see only their own, admins see all
  const visibleSignalements = isAdmin
    ? signalements
    : signalements.filter((s) => s.auteur === user?.email);

  const filtered = visibleSignalements.filter((s) => {
    const matchSearch = !search ||
      s.mot.toLowerCase().includes(search.toLowerCase()) ||
      s.contexte.toLowerCase().includes(search.toLowerCase()) ||
      s.auteur.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || s.statut === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    en_attente: visibleSignalements.filter((s) => s.statut === "en_attente").length,
    traité: visibleSignalements.filter((s) => s.statut === "traité").length,
    rejeté: visibleSignalements.filter((s) => s.statut === "rejeté").length,
  };

  const handleAddToDictionary = (s: Signalement) => {
    setCurrentSignalementId(s.id);
    setForm({
      ...emptyForm,
      terme_source: s.mot,
      abreviation: s.mot.toUpperCase().slice(0, 3),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.terme_source.trim() || !form.abreviation.trim()) {
      toast.error("Terme et abréviation requis");
      return;
    }
    const synonymes = form.synonymes.split(",").map((s) => s.trim()).filter(Boolean);
    await addEntry({
      terme_source: form.terme_source.toLowerCase(),
      abreviation: form.abreviation.toUpperCase(),
      description: form.description,
      synonymes,
      categorie: form.categorie,
      actif: true,
      auteur: user?.email || "admin",
    });
    if (currentSignalementId) {
      await updateSignalement(currentSignalementId, "traité");
      // Send notification to the user who reported
      const sig = signalements.find((s) => s.id === currentSignalementId);
      if (sig) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("email", sig.auteur)
          .single();
        if (profile?.user_id) {
          await supabase.from("notifications").insert({
            user_id: profile.user_id,
            title: "Signalement traité ✅",
            message: `Le mot "${sig.mot}" a été ajouté au dictionnaire (${form.abreviation.toUpperCase()}).`,
            type: "success",
          });
        }
      }
    }
    toast.success(`"${form.terme_source}" ajouté au dictionnaire`);
    setDialogOpen(false);
    setCurrentSignalementId(null);
  };

  const handleReject = async (id: string, mot: string) => {
    await updateSignalement(id, "rejeté");
    // Send notification to the user who reported
    const sig = signalements.find((s) => s.id === id);
    if (sig) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", sig.auteur)
        .single();
      if (profile?.user_id) {
        await supabase.from("notifications").insert({
          user_id: profile.user_id,
          title: "Signalement rejeté",
          message: `Le mot "${mot}" n'a pas été retenu pour le dictionnaire.`,
          type: "warning",
        });
      }
    }
    toast.info(`Signalement de "${mot}" rejeté`);
  };

  const exportSignalements = (format: "xlsx" | "csv") => {
    const data = filtered.map((s) => ({
      Mot: s.mot,
      Contexte: s.contexte,
      "Signalé par": s.auteur,
      Date: new Date(s.date).toLocaleDateString("fr-FR"),
      Statut: statusConfig[s.statut]?.label || s.statut,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Signalements");
    XLSX.writeFile(wb, `signalements.${format === "csv" ? "csv" : "xlsx"}`, { bookType: format === "csv" ? "csv" : "xlsx" });
    toast.success(`Export ${format.toUpperCase()} téléchargé`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mots signalés</h1>
        <p className="text-muted-foreground mt-1">
          Termes inconnus remontés par les utilisateurs lors des transformations
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="ca-stat-card">
          <Clock className="h-5 w-5 text-warning" />
          <div>
            <div className="text-2xl font-bold text-foreground">{counts.en_attente}</div>
            <div className="text-xs text-muted-foreground">En attente</div>
          </div>
        </div>
        <div className="ca-stat-card">
          <CheckCircle2 className="h-5 w-5 text-success" />
          <div>
            <div className="text-2xl font-bold text-foreground">{counts.traité}</div>
            <div className="text-xs text-muted-foreground">Traités</div>
          </div>
        </div>
        <div className="ca-stat-card">
          <XCircle className="h-5 w-5 text-destructive" />
          <div>
            <div className="text-2xl font-bold text-foreground">{counts.rejeté}</div>
            <div className="text-xs text-muted-foreground">Rejetés</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par mot, contexte ou auteur..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="en_attente">En attente</SelectItem>
            <SelectItem value="traité">Traités</SelectItem>
            <SelectItem value="rejeté">Rejetés</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => exportSignalements("xlsx")}>
          <Download className="h-3.5 w-3.5" /> Excel
        </Button>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => exportSignalements("csv")}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Flag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Aucun signalement</p>
            <p className="text-sm text-muted-foreground mt-1">
              Les termes inconnus détectés lors des transformations apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Mot signalé</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Contexte (colonne)</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Signalé par</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                  {isAdmin && <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const config = statusConfig[s.statut];
                  const StatusIcon = config.icon;
                  return (
                    <tr key={s.id} className="border-t hover:bg-muted/50 transition-colors">
                      <td className="p-3 font-mono font-semibold text-foreground">{s.mot}</td>
                      <td className="p-3 text-muted-foreground font-mono text-xs">{s.contexte}</td>
                      <td className="p-3 text-foreground">{s.auteur}</td>
                      <td className="p-3 text-muted-foreground text-xs">
                        {new Date(s.date).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 ${config.className}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {config.label}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="p-3">
                          {s.statut === "en_attente" ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs"
                                onClick={() => handleAddToDictionary(s)}
                              >
                                <Plus className="h-3 w-3" /> Ajouter
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive"
                                onClick={() => handleReject(s.id, s.mot)}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add to dictionary dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter au dictionnaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Terme source</Label>
                <Input value={form.terme_source} onChange={(e) => setForm({ ...form, terme_source: e.target.value })} placeholder="montant" />
              </div>
              <div>
                <Label>Abréviation</Label>
                <Input value={form.abreviation} onChange={(e) => setForm({ ...form, abreviation: e.target.value })} placeholder="MNT" className="font-mono" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description du terme" />
            </div>
            <div>
              <Label>Synonymes (séparés par des virgules)</Label>
              <Input value={form.synonymes} onChange={(e) => setForm({ ...form, synonymes: e.target.value })} placeholder="syn1, syn2" />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} className="gap-1">
              <Check className="h-4 w-4" /> Ajouter au dictionnaire
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
