import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, Copy, Download, Flag, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { transformColumn } from "@/lib/transformer";
import { TransformResult } from "@/lib/dictionary";
import { exportResultsToExcel } from "@/lib/excel";
import { toast } from "sonner";

const statusIcon = {
  ok: <CheckCircle2 className="h-4 w-4 text-success" />,
  ambigu: <AlertTriangle className="h-4 w-4 text-warning" />,
  inconnu: <HelpCircle className="h-4 w-4 text-destructive" />,
  partiel: <AlertTriangle className="h-4 w-4 text-warning" />,
};

const statusLabel = {
  ok: "OK",
  ambigu: "Ambigu",
  inconnu: "Inconnu",
  partiel: "Partiel",
};

const statusBadge = {
  ok: "ca-badge-ok",
  ambigu: "ca-badge-warning",
  inconnu: "ca-badge-error",
  partiel: "ca-badge-warning",
};

export default function RenamePage() {
  const { dictionary, incrementTransformations, addHistoryEntry, signalerMot } = useAppStore();
  const { user } = useAuth();
  const [columns, setColumns] = useState<string[]>([""]);
  const [results, setResults] = useState<TransformResult[]>([]);
  const [editOverrides, setEditOverrides] = useState<Record<number, string>>({});

  const addColumn = () => setColumns([...columns, ""]);
  const removeColumn = (i: number) => {
    const next = columns.filter((_, idx) => idx !== i);
    setColumns(next.length === 0 ? [""] : next);
  };
  const updateColumn = (i: number, val: string) => {
    // Check if pasted/typed value contains commas or tabs → split into multiple columns
    if (val.includes(",") || val.includes("\t")) {
      const parts = val.split(/[,\t]+/).map((s) => s.trim()).filter(Boolean);
      if (parts.length > 1) {
        const next = [...columns];
        next.splice(i, 1, ...parts);
        setColumns(next);
        return;
      }
    }
    const next = [...columns];
    next[i] = val;
    setColumns(next);
  };

  const transform = () => {
    const validCols = columns.filter((c) => c.trim());
    if (validCols.length === 0) {
      toast.error("Saisissez au moins un nom de colonne");
      return;
    }
    const res = validCols.map((c) => transformColumn(c, dictionary));
    setResults(res);
    setEditOverrides({});
    const unknowns = res.filter((r) => r.status === "inconnu" || r.status === "partiel").length;
    incrementTransformations(res.length, unknowns);
    addHistoryEntry({
      auteur: user?.email || "utilisateur",
      action: "transformation",
      terme: `${res.length} colonne(s)`,
      nouvelle_valeur: `${res.filter((r) => r.status === "ok").length} OK, ${unknowns} à revoir`,
      details: res.map((r) => ({
        original: r.original,
        transformed: r.transformed,
        status: r.status,
        confidence: r.confidence,
        mapping: r.details.map((d) => `${d.original}→${d.transformed}`).join(", "),
      })),
    });
    toast.success(`${res.length} colonne(s) transformée(s)`);
  };

  const copyResults = () => {
    const text = results.map((r, i) => `${r.original} → ${editOverrides[i] || r.transformed}`).join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Résultats copiés");
  };

  const exportResults = () => {
    const data = results.map((r, i) => ({
      original: r.original,
      transformed: editOverrides[i] || r.transformed,
      details: r.details.map((d) => `${d.original}→${d.transformed}`).join(", "),
      status: statusLabel[r.status],
    }));
    exportResultsToExcel(data);
    toast.success("Export téléchargé");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Renommer des colonnes</h1>
        <p className="text-muted-foreground mt-1">Saisissez vos noms de colonnes pour les standardiser automatiquement.</p>
      </div>

      {/* Input area */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card p-5 space-y-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-foreground">Colonnes à transformer</h2>
          <Button variant="outline" size="sm" onClick={addColumn} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </Button>
        </div>
        {columns.map((col, i) => (
          <div key={i} className="flex gap-2">
            <Input
              value={col}
              onChange={(e) => updateColumn(i, e.target.value)}
              placeholder="ex: code_salaire_montant (séparez par virgule ou tabulation)"
              className="font-mono"
              onKeyDown={(e) => e.key === "Enter" && transform()}
            />
            {columns.length > 1 && (
              <Button variant="ghost" size="icon" onClick={() => removeColumn(i)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        ))}
        <Button onClick={transform} className="gap-2 mt-2">
          Transformer <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>

      {/* Results */}
      {results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Résultats</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyResults} className="gap-1">
                <Copy className="h-3.5 w-3.5" /> Copier
              </Button>
              <Button variant="outline" size="sm" onClick={exportResults} className="gap-1">
                <Download className="h-3.5 w-3.5" /> Excel
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Nom original</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Nom proposé</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Confiance</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Détail</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="p-3 font-mono text-foreground">{r.original}</td>
                    <td className="p-3">
                      <Input
                        value={editOverrides[i] !== undefined ? editOverrides[i] : r.transformed}
                        onChange={(e) => setEditOverrides({ ...editOverrides, [i]: e.target.value })}
                        className="font-mono h-8 text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1.5 ${statusBadge[r.status]}`}>
                        {statusIcon[r.status]} {statusLabel[r.status]}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`text-sm font-medium ${r.confidence >= 80 ? 'text-success' : r.confidence >= 50 ? 'text-warning' : 'text-destructive'}`}>
                        {r.confidence}%
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {r.details.map((d, j) => (
                        <span key={j} className={`inline-block mr-1 px-1.5 py-0.5 rounded ${
                          d.status === "ok" ? "bg-success/10" : d.status === "ambigu" ? "bg-warning/10" : "bg-destructive/10"
                        }`}>
                          {d.original}→{d.transformed}
                        </span>
                      ))}
                    </td>
                    <td className="p-3">
                      {r.details.some((d) => d.status === "inconnu") && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            const unknowns = r.details.filter((d) => d.status === "inconnu");
                            unknowns.forEach((d) => signalerMot(d.original, r.original, user?.email || "utilisateur"));
                            toast.success(`${unknowns.length} mot(s) signalé(s)`);
                          }}
                        >
                          <Flag className="h-3 w-3" /> Signaler
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
