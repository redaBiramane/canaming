import { useState } from "react";
import { motion } from "framer-motion";
import { FileCode2, Copy, ArrowRight, FileDown, CheckCircle2, AlertTriangle, HelpCircle, Flag, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { parseSasScript, transformSasVariables, generateTransformedSasScript, EXAMPLE_SAS_SCRIPT, type ParsedSasScript } from "@/lib/sasTransformer";
import { TransformResult } from "@/lib/dictionary";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useI18nStore } from "@/lib/i18n";

export default function SasPage() {
  const { dictionary, signalements, stopWords, incrementTransformations, signalerMot, addHistoryEntry } = useAppStore();
  const { t, lang } = useI18nStore();
  const { user } = useAuth();
  const [sasScript, setSasScript] = useState("");
  const [parsed, setParsed] = useState<ParsedSasScript | null>(null);
  const [results, setResults] = useState<TransformResult[]>([]);
  const [transformedScript, setTransformedScript] = useState("");

  const analyze = () => {
    const input = sasScript.trim();
    if (!input) {
      toast.error(t("analysis.toast_no_script"));
      return;
    }
    const p = parseSasScript(input);
    if (!p || p.variables.length === 0) {
      toast.error(t("analysis.toast_no_vars"));
      return;
    }
    setParsed(p);
    const res = transformSasVariables(p, dictionary, stopWords);
    setResults(res);
    setTransformedScript(generateTransformedSasScript(p, res));
    const unknowns = res.filter((r) => r.status === "inconnu").length;
    incrementTransformations(res.length, unknowns);
    addHistoryEntry({
      auteur: user?.email || "utilisateur",
      action: "analyse_sql",
      terme: `Script SAS (${p.variables.length} var.)`,
      nouvelle_valeur: `${p.variables.length - unknowns} OK, ${unknowns} inconnu(s)`,
      details: p.variables.map((v, idx) => {
        const r = res[idx];
        return {
          original: v.name,
          transformed: r.transformed,
          status: r.status,
          confidence: r.confidence,
          mapping: r.details.map((d) => `${d.original}→${d.transformed}`).join(", "),
        };
      }),
    });
    toast.success(`${p.variables.length} ${t("analysis.toast_analyzed")}`);
  };

  const loadExample = () => {
    setSasScript(EXAMPLE_SAS_SCRIPT);
    toast.info(t("analysis.toast_example"));
  };

  const copyTransformed = () => {
    navigator.clipboard.writeText(transformedScript);
    toast.success(t("analysis.toast_copied"));
  };

  const downloadScript = () => {
    const blob = new Blob([transformedScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script_renamed.sas";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t("analysis.toast_downloaded"));
  };

  const resetAll = () => {
    setSasScript("");
    setParsed(null);
    setResults([]);
    setTransformedScript("");
  };

  const statusIcon = (s: string) => {
    if (s === "ok") return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
    if (s === "ambigu") return <AlertTriangle className="h-3.5 w-3.5 text-warning" />;
    return <HelpCircle className="h-3.5 w-3.5 text-destructive" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("analysis.sas_title")}</h1>
        <p className="text-muted-foreground mt-1">{t("analysis.sas_desc")}</p>
      </div>

      {/* SAS Script Input */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileCode2 className="h-4 w-4" /> SAS {t("analysis.input_script")}
          </h2>
          <Button variant="ghost" size="sm" onClick={loadExample} className="text-xs">
            {t("analysis.load_example")}
          </Button>
        </div>
        <Textarea
          value={sasScript}
          onChange={(e) => setSasScript(e.target.value)}
          placeholder={`DATA work.table;\n  SET source;\n  ma_nouvelle_variable = ancienne_variable;\nRUN;`}
          className="font-mono min-h-[250px] text-sm"
        />
        <div className="flex gap-2">
          <Button onClick={analyze} className="gap-2">
            {t("analysis.analyze_btn")} <ArrowRight className="h-4 w-4" />
          </Button>
          {(parsed || sasScript) && (
            <Button variant="outline" onClick={resetAll} className="gap-2">
              <RotateCcw className="h-4 w-4" /> {t("analysis.reset_btn")}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Results */}
      {parsed && results.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Mapping table */}
          <div className="ca-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-foreground">{t("analysis.mapping_title")}</h2>
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
                    if (allUnknowns.length > 0) toast.success(`${allUnknowns.length} ${t("analysis.toast_reported_all")}`);
                    else toast.info(t("analysis.toast_reported_all_info"));
                  }}
                >
                  <Flag className="h-3.5 w-3.5" /> {t("analysis.report_all")}
                </Button>
              )}
            </div>
            <div className="border rounded-lg overflow-x-auto">
              <table className="ca-table-resizable text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("analysis.col_original")}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("analysis.col_renamed")}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("analysis.col_status")}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">{t("analysis.col_detail")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.variables.map((v, i) => {
                    const r = results[i];
                    return (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-mono text-foreground">{v.name}</td>
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
                                        toast.success(`${unknowns.length} ${t("analysis.toast_reported")}`);
                                      }}
                                      disabled={r.details
                                        .filter((d) => d.status === "inconnu")
                                        .every((d) => signalements.some((s) => s.mot === d.original && s.statut === "en_attente"))
                                      }
                                    >
                                      <Flag className="h-3 w-3" />
                                      {t("analysis.report")}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>{t("analysis.tooltip_report")}</TooltipContent>
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
              <h2 className="font-semibold text-foreground">{t("analysis.compare_title")}</h2>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={copyTransformed} className="gap-1">
                  <Copy className="h-3.5 w-3.5" /> {t("analysis.copy")}
                </Button>
                <Button size="sm" onClick={downloadScript} className="gap-1">
                  <FileDown className="h-3.5 w-3.5" /> {t("analysis.download")} .sas
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t("analysis.original")}</p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{sasScript}</pre>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">{t("analysis.transformed")}</p>
                <div className="bg-accent rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{transformedScript}</pre>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
