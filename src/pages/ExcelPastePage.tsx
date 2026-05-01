import { useState, useRef, useCallback, useMemo } from "react";
import { useSessionStorage } from "@/hooks/useSessionStorage";
import { motion, AnimatePresence } from "framer-motion";
import {
  ClipboardPaste, ArrowRight, CheckCircle2, AlertTriangle, HelpCircle,
  Copy, Download, Flag, RotateCcw, Table2, Columns3, Sparkles, Search, X
} from "lucide-react";
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

interface DetectedColumn {
  name: string;
  index: number;
  values: string[];
}

interface ParsedData {
  headers: string[];
  rows: string[][];
  detectedColumns: DetectedColumn[];
}

function parseExcelPaste(text: string): ParsedData | null {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length === 0) return null;

  // Detect separator: tab or semicolon
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  const separator = tabCount >= semiCount ? "\t" : ";";

  const allRows = lines.map((line) => line.split(separator).map((cell) => cell.trim()));

  // If only 1 column and no clear header pattern, treat all values as column names (no header)
  if (allRows[0].length === 1) {
    const values = allRows.map((r) => r[0]).filter(Boolean);
    return {
      headers: ["Colonnes à transformer"],
      rows: allRows.slice(1),
      detectedColumns: [{
        name: "Colonnes à transformer",
        index: 0,
        values,
      }],
    };
  }

  // Multi-column: first row = headers, rest = data
  const headers = allRows[0];
  const dataRows = allRows.slice(1);

  const detectedColumns: DetectedColumn[] = headers.map((header, index) => ({
    name: header,
    index,
    values: dataRows.map((row) => row[index] || "").filter(Boolean),
  }));

  return { headers, rows: dataRows, detectedColumns };
}

export default function ExcelPastePage() {
  const { dictionary, signalements, stopWords, incrementTransformations, addHistoryEntry, signalerMot } = useAppStore();
  const { user } = useAuth();

  const [rawText, setRawText] = useSessionStorage("excel_rawText", "");
  const [parsedData, setParsedData] = useSessionStorage<ParsedData | null>("excel_parsedData", null);
  const [selectedColumns, setSelectedColumns] = useSessionStorage<Set<number>>("excel_selectedColumns", new Set());
  // Track which individual values the user wants to EXCLUDE
  const [excludedValues, setExcludedValues] = useSessionStorage<Set<string>>("excel_excludedValues", new Set());
  const [valueFilter, setValueFilter] = useSessionStorage("excel_valueFilter", "");
  const [results, setResults] = useSessionStorage<TransformResult[]>("excel_results", []);
  const [editOverrides, setEditOverrides] = useSessionStorage<Record<number, string>>("excel_editOverrides", {});
  const [step, setStep] = useSessionStorage<"paste" | "select" | "results">("excel_step", "paste");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text/plain");
      if (text) {
        setRawText(text);
        const parsed = parseExcelPaste(text);
        if (parsed && parsed.detectedColumns.length > 0) {
          setParsedData(parsed);
          setSelectedColumns(new Set(parsed.detectedColumns.map((_, i) => i)));
          // Auto-exclude stop words
          const stopWordsSet = new Set(stopWords.map((w: string) => w.toLowerCase()));
          const autoExcluded = new Set<string>();
          parsed.detectedColumns.forEach((col) => {
            col.values.forEach((v) => {
              if (stopWordsSet.has(v.trim().toLowerCase())) autoExcluded.add(v.trim());
            });
          });
          setExcludedValues(autoExcluded);
          setStep("select");
          const totalValues = parsed.detectedColumns.reduce((sum, col) => sum + col.values.length, 0);
          toast.success(`${parsed.detectedColumns.length} colonne(s) détectée(s) avec ${totalValues} valeur(s)`);
        } else {
          toast.error("Impossible de détecter des colonnes. Vérifiez le format du contenu collé.");
        }
      }
    },
    []
  );

  const handleTextChange = (text: string) => {
    setRawText(text);
  };

  const analyzeText = () => {
    if (!rawText.trim()) {
      toast.error("Collez du contenu depuis Excel d'abord");
      return;
    }
    const parsed = parseExcelPaste(rawText);
    if (parsed && parsed.detectedColumns.length > 0) {
      setParsedData(parsed);
      setSelectedColumns(new Set(parsed.detectedColumns.map((_, i) => i)));
      // Auto-exclude stop words
      const stopWordsSet = new Set(stopWords.map((w: string) => w.toLowerCase()));
      const autoExcluded = new Set<string>();
      parsed.detectedColumns.forEach((col) => {
        col.values.forEach((v) => {
          if (stopWordsSet.has(v.trim().toLowerCase())) autoExcluded.add(v.trim());
        });
      });
      setExcludedValues(autoExcluded);
      setStep("select");
      const totalValues = parsed.detectedColumns.reduce((sum, col) => sum + col.values.length, 0);
      toast.success(`${parsed.detectedColumns.length} colonne(s) détectée(s) avec ${totalValues} valeur(s)`);
    } else {
      toast.error("Impossible de détecter des colonnes. Vérifiez le format.");
    }
  };

  const toggleColumn = (index: number) => {
    const next = new Set(selectedColumns);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    setSelectedColumns(next);
  };

  const selectAllColumns = () => {
    if (parsedData) {
      setSelectedColumns(new Set(parsedData.detectedColumns.map((_, i) => i)));
    }
  };

  const deselectAllColumns = () => {
    setSelectedColumns(new Set());
  };

  // Get all unique values from selected columns
  const allUniqueValues = useMemo((): string[] => {
    if (!parsedData) return [];
    const values: string[] = [];
    parsedData.detectedColumns.forEach((col, i) => {
      if (selectedColumns.has(i)) {
        col.values.forEach((v) => {
          const trimmed = v.trim();
          if (trimmed && !values.includes(trimmed)) {
            values.push(trimmed);
          }
        });
      }
    });
    return values;
  }, [parsedData, selectedColumns]);

  // Filtered values for display (based on search)
  const filteredValues = useMemo(() => {
    if (!valueFilter.trim()) return allUniqueValues;
    const q = valueFilter.toLowerCase();
    return allUniqueValues.filter((v) => v.toLowerCase().includes(q));
  }, [allUniqueValues, valueFilter]);

  // Final values to transform (selected columns minus excluded values)
  const finalValues = useMemo(() => {
    return allUniqueValues.filter((v) => !excludedValues.has(v));
  }, [allUniqueValues, excludedValues]);

  const toggleValue = (value: string) => {
    const next = new Set(excludedValues);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    setExcludedValues(next);
  };

  const selectAllValues = () => {
    setExcludedValues(new Set());
  };

  const deselectAllValues = () => {
    setExcludedValues(new Set(allUniqueValues));
  };

  const transformSelected = () => {
    if (finalValues.length === 0) {
      toast.error("Sélectionnez au moins une valeur à transformer");
      return;
    }

    const res = finalValues.map((val) => transformColumn(val, dictionary, stopWords));
    setResults(res);
    setEditOverrides({});
    setStep("results");

    const unknowns = res.filter((r) => r.status === "inconnu" || r.status === "partiel").length;
    incrementTransformations(res.length, unknowns);
    addHistoryEntry({
      auteur: user?.email || "utilisateur",
      action: "transformation",
      terme: `${res.length} colonne(s) via collage Excel`,
      nouvelle_valeur: `${res.filter((r) => r.status === "ok").length} OK, ${unknowns} à revoir`,
      details: res.map((r) => ({
        original: r.original,
        transformed: r.transformed,
        status: r.status,
        confidence: r.confidence,
        mapping: r.details.map((d) => `${d.original}→${d.transformed}`).join(", "),
      })),
    });
    toast.success(`${res.length} valeur(s) transformée(s)`);
  };

  const copyResults = () => {
    const text = results
      .map((r, i) => `${r.original}\t${editOverrides[i] || r.transformed}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Résultats copiés (format tabulaire)");
  };

  const exportResults = () => {
    const data = results.map((r, i) => ({
      original: r.original,
      transformed: editOverrides[i] || r.transformed,
      details: r.details.map((d) => `${d.original}→${d.transformed}`).join(", "),
      status: statusLabel[r.status],
    }));
    exportResultsToExcel(data, "collage_excel_resultats.xlsx");
    toast.success("Export téléchargé");
  };

  const reset = () => {
    setRawText("");
    setParsedData(null);
    setSelectedColumns(new Set());
    setExcludedValues(new Set());
    setValueFilter("");
    setResults([]);
    setEditOverrides({});
    setStep("paste");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Collage Excel</h1>
        <p className="text-muted-foreground mt-1">
          Copiez-collez des cellules depuis Excel pour détecter et transformer automatiquement les noms de colonnes.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "paste", label: "1. Coller", icon: ClipboardPaste },
          { key: "select", label: "2. Sélectionner", icon: Columns3 },
          { key: "results", label: "3. Résultats", icon: Sparkles },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-border" />}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                step === s.key
                  ? "bg-primary text-primary-foreground"
                  : step === "results" && s.key !== "results"
                  ? "bg-success/10 text-success"
                  : step === "select" && s.key === "paste"
                  ? "bg-success/10 text-success"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Paste */}
      <AnimatePresence mode="wait">
        {step === "paste" && (
          <motion.div
            key="paste"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="ca-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <ClipboardPaste className="h-5 w-5 text-primary" />
                Collez vos données Excel
              </h2>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                onPaste={handlePaste}
                placeholder={`Collez ici le contenu copié depuis Excel...\n\nVous pouvez coller :\n• Une colonne de noms (ex: KEY, DYM, UPDATED, ...)\n• Un tableau entier avec en-têtes et données\n• Des données séparées par tabulations ou points-virgules`}
                className="w-full h-64 p-4 rounded-lg border border-border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50"
              />
              {!rawText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-3 opacity-40">
                    <ClipboardPaste className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">
                      Ctrl+V / Cmd+V pour coller
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={analyzeText} disabled={!rawText.trim()} className="gap-2">
                <Table2 className="h-4 w-4" />
                Analyser les colonnes
              </Button>
              <p className="text-xs text-muted-foreground">
                Formats supportés : tabulations (Excel), points-virgules (CSV), ou une valeur par ligne
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 2: Select columns & values */}
        {step === "select" && parsedData && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Detected columns */}
            {parsedData.detectedColumns.length > 1 && (
              <div className="ca-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Columns3 className="h-5 w-5 text-primary" />
                    Colonnes détectées ({parsedData.detectedColumns.length})
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllColumns}>
                      Tout sélectionner
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllColumns}>
                      Tout désélectionner
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Choisissez la ou les colonnes contenant les noms à transformer.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {parsedData.detectedColumns.map((col, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => toggleColumn(i)}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                        selectedColumns.has(i)
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background hover:border-muted-foreground/30"
                      }`}
                    >
                      {selectedColumns.has(i) && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <p className="font-mono font-semibold text-sm text-foreground truncate pr-6">
                        {col.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {col.values.length} valeur(s)
                      </p>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual value selection */}
            {allUniqueValues.length > 0 && (
              <div className="ca-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-foreground flex items-center gap-2">
                    <Table2 className="h-5 w-5 text-primary" />
                    Mots détectés ({allUniqueValues.length})
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllValues}>
                      Tout inclure
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllValues}>
                      Tout exclure
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Cliquez sur un mot pour l'inclure ou l'exclure de la transformation.
                  <span className="font-medium text-foreground ml-1">
                    {finalValues.length}/{allUniqueValues.length} sélectionné(s)
                  </span>
                </p>

                {/* Search bar */}
                {allUniqueValues.length > 10 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={valueFilter}
                      onChange={(e) => setValueFilter(e.target.value)}
                      placeholder="Rechercher un mot..."
                      className="pl-9 h-9"
                    />
                    {valueFilter && (
                      <button
                        onClick={() => setValueFilter("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* Value chips */}
                <div className="flex flex-wrap gap-2 max-h-72 overflow-y-auto p-1">
                  {filteredValues.map((val) => {
                    const isIncluded = !excludedValues.has(val);
                    return (
                      <motion.button
                        key={val}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => toggleValue(val)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono border transition-all cursor-pointer ${
                          isIncluded
                            ? "border-primary/40 bg-primary/5 text-foreground hover:bg-primary/10"
                            : "border-border bg-muted/50 text-muted-foreground line-through opacity-60 hover:opacity-80"
                        }`}
                      >
                        {isIncluded ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        )}
                        {val}
                      </motion.button>
                    );
                  })}
                </div>

                {valueFilter && filteredValues.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Aucun mot ne correspond à « {valueFilter} »
                  </p>
                )}

                {valueFilter && filteredValues.length < allUniqueValues.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    {filteredValues.length} résultat(s) sur {allUniqueValues.length}
                  </p>
                )}
              </div>
            )}

            {/* Data preview table */}
            <div className="ca-card p-5 space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Table2 className="h-5 w-5 text-muted-foreground" />
                Aperçu des données
              </h2>
              <div className="border rounded-lg overflow-auto max-h-48">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      {parsedData.headers.map((h, i) => (
                        <th
                          key={i}
                          className={`text-left p-2.5 font-medium text-xs whitespace-nowrap transition-colors ${
                            selectedColumns.has(i)
                              ? "text-primary bg-primary/5"
                              : "text-muted-foreground"
                          }`}
                        >
                          {h}
                          {selectedColumns.has(i) && (
                            <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                              source
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.rows.slice(0, 6).map((row, i) => (
                      <tr key={i} className="border-t">
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`p-2.5 text-xs font-mono whitespace-nowrap transition-colors ${
                              selectedColumns.has(j)
                                ? excludedValues.has(cell.trim())
                                  ? "text-muted-foreground line-through opacity-50"
                                  : "text-foreground bg-primary/[0.03] font-medium"
                                : "text-muted-foreground"
                            }`}
                          >
                            {cell || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedData.rows.length > 6 && (
                <p className="text-xs text-muted-foreground text-center">
                  … et {parsedData.rows.length - 6} autres ligne(s)
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-center">
              <Button onClick={transformSelected} disabled={finalValues.length === 0} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Transformer {finalValues.length} valeur(s)
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setStep("paste")} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Retour
              </Button>
              {excludedValues.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {excludedValues.size} mot(s) exclu(s)
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 3: Results */}
        {step === "results" && results.length > 0 && (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  label: "Total",
                  value: results.length,
                  color: "text-foreground",
                  bg: "bg-muted",
                },
                {
                  label: "OK",
                  value: results.filter((r) => r.status === "ok").length,
                  color: "text-success",
                  bg: "bg-success/10",
                },
                {
                  label: "Ambigus",
                  value: results.filter((r) => r.status === "ambigu").length,
                  color: "text-warning",
                  bg: "bg-warning/10",
                },
                {
                  label: "Inconnus",
                  value: results.filter(
                    (r) => r.status === "inconnu" || r.status === "partiel"
                  ).length,
                  color: "text-destructive",
                  bg: "bg-destructive/10",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-lg p-3 ${stat.bg} text-center`}
                >
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Results table */}
            <div className="ca-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-foreground">Résultats de la transformation</h2>
                <div className="flex gap-2">
                  {results.some((r) =>
                    r.details.some((d) => d.status === "inconnu")
                  ) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        const allUnknowns: { word: string; context: string }[] = [];
                        results.forEach((r) => {
                          r.details
                            .filter((d) => d.status === "inconnu")
                            .forEach((d) => {
                              if (
                                !signalements.some(
                                  (s: any) =>
                                    s.mot === d.original &&
                                    s.statut === "en_attente"
                                )
                              ) {
                                allUnknowns.push({
                                  word: d.original,
                                  context: r.original,
                                });
                              }
                            });
                        });
                        allUnknowns.forEach((u) =>
                          signalerMot(
                            u.word,
                            u.context,
                            user?.email || "utilisateur"
                          )
                        );
                        if (allUnknowns.length > 0)
                          toast.success(
                            `${allUnknowns.length} mot(s) signalé(s)`
                          );
                        else
                          toast.info(
                            "Tous les mots inconnus ont déjà été signalés"
                          );
                      }}
                    >
                      <Flag className="h-3.5 w-3.5" /> Signaler tout
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResults}
                    className="gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copier
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportResults}
                    className="gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> Excel
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-auto max-h-[500px]">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Nom original
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Nom proposé
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Statut
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Confiance
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Détail
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <motion.tr
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        className="border-t"
                      >
                        <td className="p-3 font-mono text-foreground">
                          {r.original}
                        </td>
                        <td className="p-3">
                          <input
                            value={
                              editOverrides[i] !== undefined
                                ? editOverrides[i]
                                : r.transformed
                            }
                            onChange={(e) =>
                              setEditOverrides({
                                ...editOverrides,
                                [i]: e.target.value,
                              })
                            }
                            className="font-mono h-8 text-sm px-2 py-1 rounded border border-border bg-background w-full focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                          />
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1.5 ${statusBadge[r.status]}`}
                          >
                            {statusIcon[r.status]} {statusLabel[r.status]}
                          </span>
                        </td>
                        <td className="p-3">
                          <span
                            className={`text-sm font-medium ${
                              r.confidence >= 80
                                ? "text-success"
                                : r.confidence >= 50
                                ? "text-warning"
                                : "text-destructive"
                            }`}
                          >
                            {r.confidence}%
                          </span>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {r.details.map((d, j) => (
                            <span
                              key={j}
                              className={`inline-block mr-1 px-1.5 py-0.5 rounded ${
                                d.status === "ok"
                                  ? "bg-success/10"
                                  : d.status === "ambigu"
                                  ? "bg-warning/10"
                                  : "bg-destructive/10"
                              }`}
                            >
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
                                const unknowns = r.details.filter(
                                  (d) => d.status === "inconnu"
                                );
                                unknowns.forEach((d) =>
                                  signalerMot(
                                    d.original,
                                    r.original,
                                    user?.email || "utilisateur"
                                  )
                                );
                                toast.success(
                                  `${unknowns.length} mot(s) signalé(s)`
                                );
                              }}
                            >
                              <Flag className="h-3 w-3" /> Signaler
                            </Button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Nouveau collage
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                className="gap-2"
              >
                <Columns3 className="h-4 w-4" />
                Modifier la sélection
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="ca-card p-5 space-y-3 border-dashed"
      >
        <h3 className="font-semibold text-foreground text-sm">💡 Comment utiliser cette fonctionnalité ?</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">1. Copier depuis Excel</p>
            <p>Sélectionnez les cellules contenant les noms de colonnes dans Excel et faites Ctrl+C / Cmd+C</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">2. Sélectionner les mots</p>
            <p>Choisissez quels mots transformer. Cliquez sur un mot pour l'exclure</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">3. Transformer en masse</p>
            <p>Les mots sélectionnés seront transformés d'un coup selon le dictionnaire</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
