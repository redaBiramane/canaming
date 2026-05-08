import { Fragment, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { Clock, Edit, Plus, Trash2, Upload, ArrowRight, Code2, Flag, Eye, X, CheckCircle2, AlertTriangle, HelpCircle, Search, Filter, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useI18nStore } from "@/lib/i18n";

const actionIcons: Record<string, JSX.Element> = {
  ajout: <Plus className="h-3.5 w-3.5 text-success" />,
  modification: <Edit className="h-3.5 w-3.5 text-warning" />,
  suppression: <Trash2 className="h-3.5 w-3.5 text-destructive" />,
  import: <Upload className="h-3.5 w-3.5 text-primary" />,
  transformation: <ArrowRight className="h-3.5 w-3.5 text-primary" />,
  analyse_sql: <Code2 className="h-3.5 w-3.5 text-primary" />,
  signalement: <Flag className="h-3.5 w-3.5 text-warning" />,
};

const actionLabels: Record<string, string> = {
  ajout: "Ajout",
  modification: "Modification",
  suppression: "Suppression",
  import: "Import",
  transformation: "Renommage",
  analyse_sql: "Analyse SQL",
  signalement: "Signalement",
};

const actionBadge: Record<string, string> = {
  ajout: "ca-badge-ok",
  modification: "ca-badge-warning",
  suppression: "ca-badge-error",
  import: "ca-badge-unknown",
  transformation: "ca-badge-ok",
  analyse_sql: "ca-badge-ok",
  signalement: "ca-badge-warning",
};

export default function HistoryPage() {
  const { history, deleteHistoryEntry } = useAppStore();
  const { user, role } = useAuth();
  const { t } = useI18nStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const filteredHistory = useMemo(() => {
    let base = role === "admin" ? history : history.filter((h) => h.auteur === user?.email);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      base = base.filter(h => 
        (h.terme || "").toLowerCase().includes(q) || 
        (h.auteur || "").toLowerCase().includes(q) ||
        (h.action || "").toLowerCase().includes(q) ||
        (h.ancienne_valeur || "").toLowerCase().includes(q) ||
        (h.nouvelle_valeur || "").toLowerCase().includes(q) ||
        (h.champ || "").toLowerCase().includes(q)
      );
    }
    
    if (actionFilter && actionFilter !== "all") {
      base = base.filter(h => h.action === actionFilter);
    }

    return base;
  }, [history, role, user?.email, searchQuery, actionFilter]);

  const selectedEntry = filteredHistory.find((h) => h.id === selectedId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.history_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.history_desc")}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background/50 border-muted-foreground/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px] bg-background/50 border-muted-foreground/20">
              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {Object.entries(actionLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(searchQuery || actionFilter !== "all") && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => { setSearchQuery(""); setActionFilter("all"); }}
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Réinitialiser
            </Button>
          )}
        </div>
      </div>

      {filteredHistory.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ca-card p-12 text-center">
          <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {searchQuery || actionFilter !== "all" ? (
              <Search className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Clock className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {searchQuery || actionFilter !== "all" ? "Aucun résultat trouvé" : t("admin.no_history")}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {searchQuery || actionFilter !== "all" 
              ? "Essayez d'ajuster vos filtres ou votre recherche pour trouver ce que vous cherchez."
              : "L'historique des transformations apparaîtra ici une fois que vous aurez effectué des actions."}
          </p>
          {(searchQuery || actionFilter !== "all") && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setSearchQuery(""); setActionFilter("all"); }}
              className="mt-6"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Effacer les filtres
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card overflow-x-auto">
          <table className="ca-table-resizable text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'14%'}}>{t("admin.col_date") || "Date"}</th>
                <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'11%'}}>{t("admin.col_action") || "Action"}</th>
                <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'23%'}}>Terme</th>
                <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'27%'}}>{t("admin.col_details") || "Détail"}</th>
                <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'15%'}}>Auteur</th>
                <th className="text-center p-3 font-medium text-muted-foreground" style={{width:'10%'}}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((h) => (
                <tr key={h.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(h.date).toLocaleString("fr-FR")}
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1.5 ${actionBadge[h.action] || "ca-badge-unknown"}`}>
                      {actionIcons[h.action]} {actionLabels[h.action] || h.action}
                    </span>
                  </td>
                  <td className="p-3 font-medium text-foreground">{h.terme}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {h.ancienne_valeur && <span className="line-through mr-2">{h.ancienne_valeur}</span>}
                    {h.nouvelle_valeur && <span className="font-medium text-primary">{h.nouvelle_valeur}</span>}
                    {h.champ && <span className="ml-1 text-muted-foreground">({h.champ})</span>}
                  </td>
                  <td className="p-3 text-muted-foreground">{h.auteur}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {h.details && h.details.length > 0 && (
                        <button
                          onClick={() => setSelectedId(h.id)}
                          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                          title="Voir le détail"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          deleteHistoryEntry(h.id);
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntry && actionIcons[selectedEntry.action]}
              {selectedEntry && (actionLabels[selectedEntry.action] || selectedEntry.action)} — {selectedEntry?.terme}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {selectedEntry && new Date(selectedEntry.date).toLocaleString("fr-FR")} • {selectedEntry?.auteur}
            </p>
          </DialogHeader>

          {selectedEntry?.details && (
            <div className="rounded-lg border overflow-x-auto mt-4">
              <table className="ca-table-resizable text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("excel.col_original")}</th>
                    {selectedEntry.details.some((d) => d.type) && (
                      <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                    )}
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("excel.col_proposed")}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("excel.col_status")}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("excel.col_confidence")}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Mapping mot par mot</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedEntry.details.map((detail, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-3 font-mono text-foreground">{detail.original}</td>
                      {selectedEntry.details!.some((d) => d.type) && (
                        <td className="p-3 text-muted-foreground text-xs">{detail.type || "—"}</td>
                      )}
                      <td className="p-3 font-mono font-semibold text-primary">{detail.transformed}</td>
                      <td className="p-3">
                        <span className={
                          detail.status === "ok" ? "ca-badge-ok" :
                          detail.status === "inconnu" ? "ca-badge-error" : "ca-badge-warning"
                        }>
                          {detail.status === "ok" ? "OK" : detail.status === "inconnu" ? "Inconnu" : detail.status === "ambigu" ? "Ambigu" : "Partiel"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium ${detail.confidence >= 80 ? 'text-success' : detail.confidence >= 50 ? 'text-warning' : 'text-destructive'}`}>
                          {detail.confidence}%
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {detail.mapping.split(", ").map((m, j) => {
                          const isOk = !m.includes("→" + m.split("→")[0]?.toUpperCase());
                          return (
                            <span key={j} className="inline-block mr-1 mb-0.5 px-1.5 py-0.5 rounded bg-muted">
                              {m}
                            </span>
                          );
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

