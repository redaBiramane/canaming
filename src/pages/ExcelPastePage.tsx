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
import { useI18nStore } from "@/lib/i18n";

const statusIcon = {
  ok: <CheckCircle2 className="h-4 w-4 text-success" />,
  ambigu: <AlertTriangle className="h-4 w-4 text-warning" />,
  inconnu: <HelpCircle className="h-4 w-4 text-destructive" />,
  partiel: <AlertTriangle className="h-4 w-4 text-warning" />,
};

const statusLabel: Record<string, string> = {
  ok: "ok",
  ambigu: "ambiguous",
  inconnu: "unknown",
  partiel: "ambiguous",
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
    const defaultColName = "Colonnes à transformer"; // This will be handled by t() in component
    return {
      headers: [defaultColName],
      rows: allRows.slice(1),
      detectedColumns: [{
        name: defaultColName,
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
  const { t } = useI18nStore();

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
          // Replace default column name if it was set in parseExcelPaste
          if (parsed.detectedColumns.length === 1 && parsed.detectedColumns[0].name === "Colonnes à transformer") {
            parsed.detectedColumns[0].name = t("excel.default_col_name");
            parsed.headers[0] = t("excel.default_col_name");
          }
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
          toast.success(`${parsed.detectedColumns.length} ${t("excel.toast_cols_detected")} ${totalValues} ${t("excel.toast_values")}`);
        } else {
          toast.error(t("excel.toast_no_cols"));
        }
      }
    },
    [stopWords, t]
  );

  const handleTextChange = (text: string) => {
    setRawText(text);
  };

  const analyzeText = () => {
    if (!rawText.trim()) {
      toast.error(t("excel.toast_no_data"));
      return;
    }
    const parsed = parseExcelPaste(rawText);
    if (parsed && parsed.detectedColumns.length > 0) {
      // Replace default column name if it was set in parseExcelPaste
      if (parsed.detectedColumns.length === 1 && parsed.detectedColumns[0].name === "Colonnes à transformer") {
        parsed.detectedColumns[0].name = t("excel.default_col_name");
        parsed.headers[0] = t("excel.default_col_name");
      }
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
      toast.success(`${parsed.detectedColumns.length} ${t("excel.toast_cols_detected")} ${totalValues} ${t("excel.toast_values")}`);
    } else {
      toast.error(t("excel.toast_no_cols"));
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
      toast.error(t("excel.toast_select_one"));
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
    toast.success(`${res.length} ${t("excel.toast_transformed")}`);
  };

  const copyResults = () => {
    const text = results
      .map((r, i) => `${r.original}\t${editOverrides[i] || r.transformed}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success(t("excel.toast_copied"));
  };

  const exportResults = () => {
    const data = results.map((r, i) => ({
      original: r.original,
      transformed: editOverrides[i] || r.transformed,
      details: r.details.map((d) => `${d.original}→${d.transformed}`).join(", "),
      status: t(`excel.summary_${statusLabel[r.status]}`),
    }));
    exportResultsToExcel(data, "collage_excel_resultats.xlsx");
    toast.success(t("excel.toast_exported"));
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
        <h1 className="text-2xl font-bold text-foreground">{t("excel.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("excel.desc")}</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { key: "paste", label: t("excel.step_paste"), icon: ClipboardPaste },
          { key: "select", label: t("excel.step_select"), icon: Columns3 },
          { key: "results", label: t("excel.step_results"), icon: Sparkles },
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
                {t("excel.paste_title")}
              </h2>
            </div>

            <div className="relative">
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => handleTextChange(e.target.value)}
                onPaste={handlePaste}
                placeholder={t("excel.paste_placeholder")}
                className="w-full h-64 p-4 rounded-lg border border-border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all placeholder:text-muted-foreground/50"
              />
              {!rawText && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-3 opacity-40">
                    <ClipboardPaste className="h-12 w-12 mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">
                      {t("excel.paste_hint")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button onClick={analyzeText} disabled={!rawText.trim()} className="gap-2">
                <Table2 className="h-4 w-4" />
                {t("excel.analyze_cols")}
              </Button>
              {rawText && (
                <Button variant="outline" onClick={reset} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  {t("excel.reset")}
                </Button>
              )}
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t("excel.supported_formats")}
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
                    {t("excel.cols_detected")} ({parsedData.detectedColumns.length})
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllColumns}>
                      {t("excel.select_all")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllColumns}>
                      {t("excel.deselect_all")}
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {t("excel.choose_cols")}
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
                        {col.values.length} {t("excel.toast_values")}
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
                    {t("excel.words_detected")} ({allUniqueValues.length})
                  </h2>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllValues}>
                      {t("excel.include_all")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAllValues}>
                      {t("excel.exclude_all")}
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {t("excel.click_to_include")}
                  <span className="font-medium text-foreground ml-1">
                    {finalValues.length}/{allUniqueValues.length} {t("excel.selected")}
                  </span>
                </p>

                {/* Search bar */}
                {allUniqueValues.length > 10 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={valueFilter}
                      onChange={(e) => setValueFilter(e.target.value)}
                      placeholder={t("excel.search")}
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
                    {t("excel.no_match")} « {valueFilter} »
                  </p>
                )}

                {valueFilter && filteredValues.length < allUniqueValues.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    {filteredValues.length} {t("excel.results_of")} {allUniqueValues.length}
                  </p>
                )}
              </div>
            )}

            {/* Data preview table */}
            <div className="ca-card p-5 space-y-3">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Table2 className="h-5 w-5 text-muted-foreground" />
                {t("excel.data_preview")}
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
                              {t("excel.source")}
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
                  {t("excel.and_more_rows").replace("{count}", (parsedData.rows.length - 6).toString())}
                </p>
              )}
            </div>

            <div className="flex gap-2 items-center">
              <Button onClick={transformSelected} disabled={finalValues.length === 0} className="gap-2">
                <Sparkles className="h-4 w-4" />
                {t("excel.transform_btn")} {finalValues.length} {t("excel.transform_btn_suffix")}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => setStep("paste")} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t("excel.back")}
              </Button>
              {excludedValues.size > 0 && (
                <span className="text-xs text-muted-foreground">
                  {t("excel.words_excluded").replace("{count}", excludedValues.size.toString())}
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
                  label: t("excel.summary_total"),
                  value: results.length,
                  color: "text-foreground",
                  bg: "bg-muted",
                },
                {
                  label: t("excel.summary_ok"),
                  value: results.filter((r) => r.status === "ok").length,
                  color: "text-success",
                  bg: "bg-success/10",
                },
                {
                  label: t("excel.summary_ambiguous"),
                  value: results.filter((r) => r.status === "ambigu").length,
                  color: "text-warning",
                  bg: "bg-warning/10",
                },
                {
                  label: t("excel.summary_unknown"),
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
                <h2 className="font-semibold text-foreground">{t("excel.results_title")}</h2>
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
                            t("excel.toast_reported_all").replace("{count}", allUnknowns.length.toString())
                          );
                        else
                          toast.info(
                            t("excel.toast_reported_all_info")
                          );
                      }}
                    >
                      <Flag className="h-3.5 w-3.5" /> {t("excel.report_all")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyResults}
                    className="gap-1"
                  >
                    <Copy className="h-3.5 w-3.5" /> {t("excel.copy")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportResults}
                    className="gap-1"
                  >
                    <Download className="h-3.5 w-3.5" /> {t("excel.download_excel")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="gap-1"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> {t("excel.reset")}
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg overflow-x-auto max-h-[500px]">
                <table className="ca-table-resizable text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        {t("excel.col_original")}
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        {t("excel.col_proposed")}
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        {t("excel.col_status")}
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        {t("excel.col_confidence")}
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        {t("excel.col_detail")}
                      </th>
                      <th className="text-left p-3 font-medium text-muted-foreground">
                        {t("excel.col_actions")}
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
                            {statusIcon[r.status]} {t(`excel.summary_${statusLabel[r.status]}`)}
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
                                  t("excel.toast_reported_all").replace("{count}", unknowns.length.toString())
                                );
                              }}
                            >
                              <Flag className="h-3 w-3" /> {t("analysis.report")}
                            </Button>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={reset} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t("excel.reset")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                className="gap-2"
              >
                <Columns3 className="h-4 w-4" />
                {t("excel.step_select")}
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
        <h3 className="font-semibold text-foreground text-sm">{t("excel.help_title")}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
          <div className="space-y-1">
            <p className="font-medium text-foreground">{t("excel.help_step_1_title")}</p>
            <p>{t("excel.help_step_1_desc")}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">{t("excel.help_step_2_title")}</p>
            <p>{t("excel.help_step_2_desc")}</p>
          </div>
          <div className="space-y-1">
            <p className="font-medium text-foreground">{t("excel.help_step_3_title")}</p>
            <p>{t("excel.help_step_3_desc")}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
