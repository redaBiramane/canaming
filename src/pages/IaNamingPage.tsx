import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Copy, ArrowRight, FileDown, RotateCcw, AlertCircle, Loader2, ArrowRightLeft, Zap, BrainCircuit, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { transformWithLLM, type LLMTransformResult } from "@/lib/llmService";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

const EXAMPLE_QUERY = `SELECT 
    c.nom_client,
    c.prenom_client,
    c.date_naissance,
    c.adresse_client,
    c.ville_client,
    c.telephone_client,
    co.type_contrat,
    co.montant_total,
    co.solde_compte,
    co.reference_operation,
    co.devise_compte,
    co.statut_contrat,
    co.date_debut_contrat,
    co.date_fin_contrat
FROM clients c
INNER JOIN contrats co ON c.code_client = co.code_client
WHERE co.statut_contrat = 'actif'
ORDER BY c.nom_client;`;

export default function IaNamingPage() {
  const { dictionary, incrementTransformations, addHistoryEntry } = useAppStore();
  const { user, role } = useAuth();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<LLMTransformResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: apiKeyData } = useQuery({
    queryKey: ["app_settings", "openai_api_key"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "openai_api_key")
        .single();
      if (error) return null;
      return data?.value || null;
    },
  });

  const apiKey = apiKeyData;
  const isConfigured = !!apiKey;

  const analyze = async () => {
    const input = query.trim();
    if (!input) {
      toast.error("Collez une requête SQL");
      return;
    }
    if (!apiKey) {
      toast.error("Clé API OpenAI non configurée. Contactez un administrateur.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await transformWithLLM(input, dictionary, apiKey);
      setResult(res);
      incrementTransformations(res.mappings.length, 0);
      addHistoryEntry({
        auteur: user?.email || "utilisateur",
        action: "analyse_sql",
        terme: `IA Naming (${res.mappings.length} col.)`,
        nouvelle_valeur: res.explanation,
        details: res.mappings.map((m) => ({
          original: m.original,
          transformed: m.transformed,
          status: "ok" as const,
          confidence: 100,
          mapping: m.reason,
        })),
      });
      toast.success(`${res.mappings.length} colonne(s) transformée(s) par l'IA`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'appel à l'IA");
    } finally {
      setLoading(false);
    }
  };

  const loadExample = () => {
    setQuery(EXAMPLE_QUERY);
    toast.info("Exemple chargé");
  };

  const copyTransformed = () => {
    if (result) {
      navigator.clipboard.writeText(result.transformedQuery);
      setCopied(true);
      toast.success("Requête transformée copiée");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadResult = () => {
    if (result) {
      const blob = new Blob([result.transformedQuery], { type: "text/sql" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "query_ia_renamed.sql";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Fichier SQL téléchargé");
    }
  };

  const resetAll = () => {
    setQuery("");
    setResult(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-primary/10 via-accent to-primary/5 p-6"
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            animate={{ x: [0, 100, 0], y: [0, -50, 0], opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-4 right-20 w-32 h-32 bg-primary/10 rounded-full blur-3xl"
          />
          <motion.div
            animate={{ x: [0, -80, 0], y: [0, 30, 0], opacity: [0.05, 0.2, 0.05] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-0 left-10 w-48 h-48 bg-success/10 rounded-full blur-3xl"
          />
        </div>

        <div className="relative z-10 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15 border border-primary/20">
                <BrainCircuit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">IA Naming</h1>
                <p className="text-xs font-medium text-primary tracking-widest uppercase">Powered by OpenAI</p>
              </div>
            </div>
            <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
              Collez n'importe quelle requête SQL — l'IA transformera <strong className="text-foreground">intelligemment</strong> tous les noms de colonnes selon le dictionnaire de nommage Crédit Agricole.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-card/80 backdrop-blur-sm border rounded-lg px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${isConfigured ? 'bg-success animate-pulse' : 'bg-destructive'}`} />
            <span className="text-xs font-medium text-muted-foreground">
              {isConfigured ? "IA connectée" : "IA non connectée"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* API Key Warning */}
      <AnimatePresence>
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/15 flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-warning" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">Configuration requise</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {role === "admin"
                      ? "Rendez-vous dans Paramètres → Configuration IA pour ajouter votre clé API OpenAI."
                      : "Contactez un administrateur pour activer la transformation par IA."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border bg-card shadow-sm overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm text-foreground">Requête SQL libre</span>
          </div>
          <Button variant="ghost" size="sm" onClick={loadExample} className="text-xs gap-1.5 hover:bg-primary/10 hover:text-primary">
            <Sparkles className="h-3 w-3" /> Charger un exemple
          </Button>
        </div>
        <div className="p-5 space-y-4">
          <div className="relative">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`SELECT\n    nom_client,\n    prenom_client,\n    montant_total\nFROM clients\nWHERE statut = 'actif';`}
              className="font-mono min-h-[220px] text-sm bg-muted/30 border-muted focus:border-primary/40 resize-none"
            />
            {query && (
              <span className="absolute bottom-3 right-3 text-[10px] text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                {query.split('\n').length} lignes
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={analyze}
              disabled={loading || !isConfigured}
              className="gap-2 relative overflow-hidden group"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Analyse en cours…</span>
                </>
              ) : (
                <>
                  <BrainCircuit className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span>Transformer avec l'IA</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </Button>
            {(result || query) && (
              <Button variant="outline" onClick={resetAll} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Loading State */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="rounded-xl border bg-card p-8 flex flex-col items-center gap-4"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <BrainCircuit className="h-8 w-8 text-primary" />
              </div>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
              />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">L'IA analyse votre requête…</p>
              <p className="text-xs text-muted-foreground mt-1">
                Application du dictionnaire de nommage ({dictionary.length} règles)
              </p>
            </div>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* AI Explanation Banner */}
            {result.explanation && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 via-transparent to-accent/30 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Résumé de l'IA</p>
                    <p className="text-sm text-foreground leading-relaxed">{result.explanation}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Mapping Table */}
            {result.mappings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl border bg-card shadow-sm overflow-hidden"
              >
                <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-sm text-foreground">
                      Mapping des colonnes
                    </span>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      {result.mappings.length}
                    </span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Original</th>
                        <th className="text-center p-3 font-medium text-muted-foreground w-8"></th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Transformé</th>
                        <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase tracking-wider">Explication</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.mappings.map((m, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.03 }}
                          className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        >
                          <td className="p-3 font-mono text-foreground text-sm">{m.original}</td>
                          <td className="p-3 text-center">
                            <ArrowRight className="h-3 w-3 text-primary mx-auto" />
                          </td>
                          <td className="p-3">
                            <span className="font-mono font-semibold text-primary bg-primary/5 px-2 py-0.5 rounded">
                              {m.transformed}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-muted-foreground">{m.reason}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* Side-by-Side Diff */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-xl border bg-card shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                <span className="font-semibold text-sm text-foreground">Comparaison avant / après</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyTransformed}
                    className={`gap-1.5 text-xs transition-all ${copied ? 'border-success text-success' : ''}`}
                  >
                    {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? "Copié !" : "Copier"}
                  </Button>
                  <Button size="sm" onClick={downloadResult} className="gap-1.5 text-xs">
                    <FileDown className="h-3.5 w-3.5" /> Télécharger .sql
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-destructive/60" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Original</p>
                  </div>
                  <div className="bg-muted/40 rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-[450px] overflow-y-auto border border-border/50">
                    <pre className="whitespace-pre-wrap text-foreground/80">{query}</pre>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Transformé par l'IA</p>
                  </div>
                  <div className="bg-primary/[0.03] rounded-lg p-4 font-mono text-sm overflow-x-auto max-h-[450px] overflow-y-auto border border-primary/10">
                    <pre className="whitespace-pre-wrap text-foreground">{result.transformedQuery}</pre>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
