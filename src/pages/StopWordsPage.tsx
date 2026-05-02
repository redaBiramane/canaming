import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Trash2, Search, X, Ban, AlertTriangle, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useI18nStore } from "@/lib/i18n";

export default function StopWordsPage() {
  const { stopWords, addStopWord, removeStopWord, saveStopWords } = useAppStore();
  const { role } = useAuth();
  const isAdmin = role === "admin";
  const { t, lang } = useI18nStore();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newWords, setNewWords] = useState("");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const filtered = search
    ? stopWords.filter((w: string) => w.toLowerCase().includes(search.toLowerCase()))
    : stopWords;

  const handleAddWords = async () => {
    const words = newWords
      .split(/[,;\n]+/)
      .map((w: string) => w.trim().toLowerCase())
      .filter(Boolean);
    if (words.length === 0) {
      toast.error(t("admin.toast_error"));
      return;
    }
    const newOnes = words.filter((w: string) => !stopWords.includes(w));
    if (newOnes.length === 0) {
      toast.info(t("admin.words_exist"));
      setDialogOpen(false);
      return;
    }
    await saveStopWords([...stopWords, ...newOnes]);
    toast.success(`${newOnes.length} ${t("admin.words_added")}`);
    setNewWords("");
    setDialogOpen(false);
  };

  const handleRemove = async (word: string) => {
    await removeStopWord(word);
    toast.success(`"${word}" ${t("admin.word_removed")}`);
  };

  const handleRemoveAll = async () => {
    if (!confirm(t("admin.delete_all_confirm"))) return;
    await saveStopWords([]);
    toast.success(t("admin.toast_deleted"));
  };

  const handleResetDefaults = async () => {
    const defaults = [
      "de", "du", "des", "le", "la", "les", "l", "un", "une",
      "et", "ou", "en", "au", "aux", "par", "pour", "sur", "avec",
      "dans", "ce", "cette", "ces", "son", "sa", "ses",
    ];
    await saveStopWords(defaults);
    toast.success(t("admin.toast_saved"));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.stopwords_title")}</h1>
          <p className="text-muted-foreground mt-1">
            {stopWords.length} {t("admin.stopwords_desc")}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetDefaults} className="gap-1">
              <RotateCcw className="h-3.5 w-3.5" /> {t("excel.reset")}
            </Button>
            {stopWords.length > 0 && (
              <Button variant="destructive" size="sm" onClick={handleRemoveAll} className="gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {t("admin.delete")}
              </Button>
            )}
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> {t("admin.btn_add_dict")}
            </Button>
          </div>
        )}
      </div>

      {/* Info card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ca-card p-5 border-dashed"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
            <Ban className="h-5 w-5 text-warning" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">{t("admin.what_is_stopword")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.stopword_desc1")} <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">DE</span>,{" "}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">LE</span>,{" "}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">LA</span>,{" "}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">DES</span>,{" "}
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">POUR</span>.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("admin.stopword_desc2")}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      {stopWords.length > 10 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.search")}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Words grid */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="ca-card p-5"
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {search ? (
              <p>{t("excel.no_match")} « {search} »</p>
            ) : (
              <div className="space-y-3">
                <Ban className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p>{t("admin.no_stopwords")}</p>
                {isAdmin && (
                  <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1">
                    <Plus className="h-3.5 w-3.5" /> {t("admin.add_stopwords")}
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {filtered.map((word: string) => (
              <motion.div
                key={word}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-mono border border-border bg-muted/50 text-foreground ${
                  isAdmin ? "group" : ""
                }`}
              >
                <Ban className="h-3 w-3 text-muted-foreground" />
                {word}
                {isAdmin && (
                  <button
                    onClick={() => handleRemove(word)}
                    className="ml-0.5 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                    title="Retirer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {search && filtered.length < stopWords.length && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            {filtered.length} {t("excel.results_of")} {stopWords.length}
          </p>
        )}
      </motion.div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.add_stopwords")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("admin.words_to_add")}</Label>
              <p className="text-xs text-muted-foreground mb-2">
                {t("admin.words_to_add_desc")}
              </p>
              <textarea
                value={newWords}
                onChange={(e) => setNewWords(e.target.value)}
                placeholder="de, le, la, les, un, une..."
                className="w-full h-32 p-3 rounded-lg border border-border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
            {newWords.trim() && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Aperçu :</p>
                <div className="flex flex-wrap gap-1.5">
                  {newWords
                    .split(/[,;\n]+/)
                    .map((w) => w.trim().toLowerCase())
                    .filter(Boolean)
                    .map((w, i) => (
                      <span
                        key={i}
                        className={`inline-block px-2 py-0.5 rounded text-xs font-mono ${
                          stopWords.includes(w)
                            ? "bg-muted text-muted-foreground line-through"
                            : "bg-primary/10 text-primary"
                        }`}
                      >
                        {w}
                        {stopWords.includes(w) && ` (${t("admin.already_exists")})`}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("admin.cancel")}</Button>
            <Button onClick={handleAddWords} className="gap-1" disabled={!newWords.trim()}>
              <Plus className="h-4 w-4" /> {t("admin.btn_add_dict")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
