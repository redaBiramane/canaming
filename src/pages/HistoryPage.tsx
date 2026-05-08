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
  const [filters, setFilters] = useState({
    date: "",
    action: "all",
    term: "",
    detail: "",
    author: ""
  });

  const filteredHistory = useMemo(() => {
    let base = role === "admin" ? history : history.filter((h) => h.auteur === user?.email);
    
    return base.filter(h => {
      const dateStr = new Date(h.date).toLocaleString("fr-FR").toLowerCase();
      const matchDate = !filters.date || dateStr.includes(filters.date.toLowerCase());
      const matchAction = filters.action === "all" || h.action === filters.action;
      const matchTerm = !filters.term || (h.terme || "").toLowerCase().includes(filters.term.toLowerCase());
      const matchDetail = !filters.detail || 
        ((h.ancienne_valeur || "").toLowerCase().includes(filters.detail.toLowerCase()) || 
         (h.nouvelle_valeur || "").toLowerCase().includes(filters.detail.toLowerCase()) ||
         (h.champ || "").toLowerCase().includes(filters.detail.toLowerCase()));
      const matchAuthor = !filters.author || (h.auteur || "").toLowerCase().includes(filters.author.toLowerCase());
      
      return matchDate && matchAction && matchTerm && matchDetail && matchAuthor;
    });
  }, [history, role, user?.email, filters]);

  const hasActiveFilters = filters.date !== "" || filters.action !== "all" || filters.term !== "" || filters.detail !== "" || filters.author !== "";

  const clearFilters = () => setFilters({ date: "", action: "all", term: "", detail: "", author: "" });

  const selectedEntry = filteredHistory.find((h) => h.id === selectedId);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.history_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.history_desc")}</p>
        </div>
        
        {hasActiveFilters && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={clearFilters}
            className="text-muted-foreground hover:text-primary border-dashed"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Réinitialiser les filtres
          </Button>
        )}
      </div>

      {filteredHistory.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ca-card p-12 text-center">
          <div className="bg-muted/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            {hasActiveFilters ? (
              <Search className="h-8 w-8 text-muted-foreground" />
            ) : (
              <Clock className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-1">
            {hasActiveFilters ? "Aucun résultat trouvé" : t("admin.no_history")}
          </h3>
          <p className="text-muted-foreground max-w-sm mx-auto">
            {hasActiveFilters 
              ? "Ajustez vos filtres par colonne pour trouver ce que vous cherchez."
              : "L'historique des transformations apparaîtra ici une fois que vous aurez effectué des actions."}
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-6">
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Effacer les filtres
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ca-table-resizable text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'14%'}}>
                    <div className="flex flex-col gap-2">
                      <span>{t("admin.col_date") || "Date"}</span>
                      <Input 
                        size={1}
                        value={filters.date}
                        onChange={(e) => setFilters({...filters, date: e.target.value})}
                        className="h-7 text-[10px] px-2 bg-background border-muted-foreground/10"
                        placeholder="Filtrer..."
                      />
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'11%'}}>
                    <div className="flex flex-col gap-2">
                      <span>{t("admin.col_action") || "Action"}</span>
                      <select 
                        value={filters.action}
                        onChange={(e) => setFilters({...filters, action: e.target.value})}
                        className="h-7 text-[10px] px-1 bg-background border border-muted-foreground/10 rounded-md outline-none focus:border-primary"
                      >
                        <option value="all">Toutes</option>
                        {Object.entries(actionLabels).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'23%'}}>
                    <div className="flex flex-col gap-2">
                      <span>Terme</span>
                      <Input 
                        value={filters.term}
                        onChange={(e) => setFilters({...filters, term: e.target.value})}
                        className="h-7 text-[10px] px-2 bg-background border-muted-foreground/10"
                        placeholder="Filtrer..."
                      />
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'27%'}}>
                    <div className="flex flex-col gap-2">
                      <span>{t("admin.col_details") || "Détail"}</span>
                      <Input 
                        value={filters.detail}
                        onChange={(e) => setFilters({...filters, detail: e.target.value})}
                        className="h-7 text-[10px] px-2 bg-background border-muted-foreground/10"
                        placeholder="Filtrer..."
                      />
                    </div>
                  </th>
                  <th className="text-left p-3 font-medium text-muted-foreground" style={{width:'15%'}}>
                    <div className="flex flex-col gap-2">
                      <span>Auteur</span>
                      <Input 
                        value={filters.author}
                        onChange={(e) => setFilters({...filters, author: e.target.value})}
                        className="h-7 text-[10px] px-2 bg-background border-muted-foreground/10"
                        placeholder="Filtrer..."
                      />
                    </div>
                  </th>
                  <th className="text-center p-3 font-medium text-muted-foreground" style={{width:'10%'}}>
                    <span>Actions</span>
                  </th>
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
        </div>
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

