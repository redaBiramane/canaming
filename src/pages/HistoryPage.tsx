import { motion } from "framer-motion";
import { useAppStore } from "@/hooks/useStore";
import { Clock, Edit, Plus, Trash2, Upload, ArrowRight, Code2, Flag } from "lucide-react";

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
  const { history } = useAppStore();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Historique des modifications</h1>
        <p className="text-muted-foreground mt-1">{history.length} entrée(s) dans l'historique</p>
      </div>

      {history.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ca-card p-12 text-center">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucune modification enregistrée pour le moment.</p>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Terme</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Détail</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Auteur</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t">
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
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
