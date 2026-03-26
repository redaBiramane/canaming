import { useState } from "react";
import { motion } from "framer-motion";
import { Database, Copy, ArrowRight, FileDown, CheckCircle2, AlertTriangle, HelpCircle, Flag, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { parseDbtModel, transformDbtColumns, generateTransformedDbtModel, EXAMPLE_DBT_MODEL, type ParsedDbtModel } from "@/lib/dbtTransformer";
import { TransformResult } from "@/lib/dictionary";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function DbtPage() {
  const { dictionary, signalements, incrementTransformations, signalerMot, addHistoryEntry } = useAppStore();
  const { user } = useAuth();
  const [dbtModel, setDbtModel] = useState("");
  const [parsed, setParsed] = useState<ParsedDbtModel | null>(null);
  const [results, setResults] = useState<TransformResult[]>([]);
  const [transformedModel, setTransformedModel] = useState("");

  const analyze = () => {
    const input = dbtModel.trim();
    if (!input) {
      toast.error("Collez un modèle dbt");
      return;
    }
    const p = parseDbtModel(input);
    if (!p || p.columns.length === 0) {
      toast.error("Aucune colonne détectée. Vérifiez que votre modèle contient un SELECT avec des colonnes.");
      return;
    }
    setParsed(p);
    const res = transformDbtColumns(p, dictionary);
    setResults(res);
    setTransformedModel(generateTransformedDbtModel(p, res));
    const unknowns = res.filter((r) => r.status === "inconnu").length;
    incrementTransformations(res.length, unknowns);
    addHistoryEntry({
      auteur: user?.email || "utilisateur",
      action: "analyse_sql",
      terme: `Modèle dbt (${p.columns.length} col.)`,
      nouvelle_valeur: `${p.columns.length - unknowns} OK, ${unknowns} inconnu(s)`,
      details: p.columns.map((col, idx) => {
        const r = res[idx];
        return {
          original: col.alias,
          transformed: r.transformed,
          status: r.status,
          confidence: r.confidence,
          mapping: r.details.map((d) => `${d.original}→${d.transformed}`).join(", "),
        };
      }),
    });
    toast.success(`${p.columns.length} colonnes détectées et transformées`);
  };

  const loadExample = () => {
    setDbtModel(EXAMPLE_DBT_MODEL);
    toast.info("Exemple dbt chargé");
  };

  const copyTransformed = () => {
    navigator.clipboard.writeText(transformedModel);
    toast.success("Modèle transformé copié");
  };

  const downloadModel = () => {
    const blob = new Blob([transformedModel], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "model_renamed.sql";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Fichier dbt téléchargé");
  };

  const resetAll = () => {
    setDbtModel("");
    setParsed(null);
    setResults([]);
    setTransformedModel("");
  };

  const statusIcon = (s: string) => {
    if (s === "ok") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (s === "ambigu") return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
    return <HelpCircle className="h-3.5 w-3.5 text-destructive" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analyse DBT</h1>
        <p className="text-muted-foreground mt-1">Collez un modèle dbt pour transformer automatiquement tous les noms de colonnes avec le dictionnaire.</p>
      </div>

      {/* DBT Model Input */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Database className="h-4 w-4" /> Modèle dbt
          </h2>
          <Button variant="ghost" size="sm" onClick={loadExample} className="text-xs">
            Charger un exemple
          </Button>
        </div>
        <Textarea
          value={dbtModel}
          onChange={(e) => setDbtModel(e.target.value)}
          placeholder={`{{ config(materialized='table') }}\n\nSELECT\n    code_client,\n    nom_client,\n    date_naissance\nFROM {{ ref('stg_source') }}`}
          className="font-mono min-h-[250px] text-sm"
        />
        <div className="flex gap-2">
          <Button onClick={analyze} className="gap-2">
            Analyser et transformer <ArrowRight className="h-4 w-4" />
          </Button>
          {(parsed || dbtModel) && (
            <Button variant="outline" onClick={resetAll} className="gap-2">
              <RotateCcw className="h-4 w-4" /> Remise à zéro
            </Button>
          )}
        </div>
      </motion.div>

      {/* Results */}
      {parsed && results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Column mapping table */}
          <div className="ca-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">Mapping des colonnes</h2>
              {results.some((r) => r.details.some((d) => d.status === "inconnu")) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => {
                    const allUnknowns: { word: string; context: string }[] = [];
                    results.forEach((r) => {
                      r.details.filter((d) => d.status === "inconnu").forEach((d) => {
                        if (!signalements.some((s) => s.mot === d.original && s.statut === "en_attente")) {
                          allUnknowns.push({ word: d.original, context: r.original });
                        }
                      });
                    });
                    allUnknowns.forEach((u) => signalerMot(u.word, u.context, user?.email || "utilisateur"));
                    if (allUnknowns.length > 0) toast.success(`${allUnknowns.length} mot(s) signalé(s)`);
                    else toast.info("Tous les mots inconnus ont déjà été signalés");
                  }}
                >
                  <Flag className="h-3.5 w-3.5" /> Signaler tout
                </Button>
              )}
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Colonne originale</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Colonne renommée</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Statut</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Détail</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.columns.map((col, i) => {
                    const r = results[i];
                    return (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-mono text-foreground">{col.alias}</td>
                        <td className="p-3 font-mono font-semibold text-primary">{r.transformed}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center gap-1">
                            {statusIcon(r.status)}
                            <span className="text-xs">{r.confidence}%</span>
                          </span>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-1">
                            {r.details.map((d, j) => (
                              <span key={j} className={`inline-block px-1.5 py-0.5 rounded ${
                                d.status === "ok" ? "bg-success/10" : d.status === "ambigu" ? "bg-warning/10" : "bg-destructive/10"
                              }`}>
                                {d.original}→{d.transformed}
                              </span>
                            ))}
                            {r.details.some((d) => d.status === "inconnu") && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs text-destructive hover:text-destructive gap-1"
                                      onClick={() => {
                                        const unknowns = r.details.filter((d) => d.status === "inconnu");
                                        unknowns.forEach((d) => signalerMot(d.original, r.original, user?.email || "utilisateur"));
                                        toast.success(`${unknowns.length} mot(s) signalé(s) à l'équipe Data Quality`);
                                      }}
                                      disabled={r.details
                                        .filter((d) => d.status === "inconnu")
                                        .every((d) => signalements.some((s) => s.mot === d.original && s.statut === "en_attente"))
                                      }
                                    >
                                      <Flag className="h-3 w-3" />
                                      Signaler
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Signaler les mots inconnus à l'admin pour ajout au dictionnaire</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side-by-side diff */}
          <div className="ca-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Comparaison avant / après</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyTransformed} className="gap-1">
                  <Copy className="h-3.5 w-3.5" /> Copier
                </Button>
                <Button size="sm" onClick={downloadModel} className="gap-1">
                  <FileDown className="h-3.5 w-3.5" /> Télécharger .sql
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Original</p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{dbtModel}</pre>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Transformé</p>
                <div className="bg-accent rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{transformedModel}</pre>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
