import { useState } from "react";
import { motion } from "framer-motion";
import {
  Plus, Pencil, Trash2, Search, Upload, Download, X, Check, Filter, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { DictionaryEntry } from "@/lib/dictionary";
import { importFromExcel, exportToExcel } from "@/lib/excel";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useI18nStore } from "@/lib/i18n";

interface FormData {
  terme_source: string;
  abreviation: string;
  description: string;
  synonymes: string;
  categorie: string;
}

const emptyForm: FormData = { terme_source: "", abreviation: "", description: "", synonymes: "", categorie: "Général" };

export default function AdminPage() {
  const { dictionary, signalements, addEntry, updateEntry, deleteEntry, importDictionary, updateSignalement } = useAppStore();
  const { role, user } = useAuth();
  const { t, lang } = useI18nStore();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const isAdmin = role === "admin";




  const filtered = dictionary.filter((e) => {
    const matchSearch = !search || 
      e.terme_source.toLowerCase().includes(search.toLowerCase()) ||
      e.abreviation.toLowerCase().includes(search.toLowerCase()) ||
      e.synonymes.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchCat = catFilter === "all" || e.categorie === catFilter;
    return matchSearch && matchCat;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entry: DictionaryEntry) => {
    setEditingId(entry.id);
    setForm({
      terme_source: entry.terme_source,
      abreviation: entry.abreviation,
      description: entry.description,
      synonymes: entry.synonymes.join(", "),
      categorie: entry.categorie,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.terme_source.trim() || !form.abreviation.trim()) {
      toast.error(t("admin.toast_error"));
      return;
    }
    const synonymes = form.synonymes.split(",").map((s) => s.trim()).filter(Boolean);
    if (editingId) {
      await updateEntry(editingId, {
        terme_source: form.terme_source.toLowerCase(),
        abreviation: form.abreviation.toUpperCase(),
        description: form.description,
        synonymes,
        categorie: form.categorie,
      }, user?.email || "admin");
      toast.success(t("admin.toast_saved"));
    } else {
      await addEntry({
        terme_source: form.terme_source.toLowerCase(),
        abreviation: form.abreviation.toUpperCase(),
        description: form.description,
        synonymes,
        categorie: form.categorie,
        actif: true,
        auteur: user?.email || "admin",
      });
      toast.success(t("admin.toast_saved"));
    }
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t("admin.delete_confirm"))) {
      await deleteEntry(id, user?.email || "admin");
      toast.success(t("admin.toast_deleted"));
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm(t("admin.delete_confirm"))) return;
    try {
      await importDictionary([], user?.email || "admin");
      toast.success(t("admin.toast_deleted"));
    } catch (err) {
      toast.error(t("admin.toast_error"));
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx,.xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const result = await importFromExcel(file);
      if (!result.success) {
        result.errors.forEach((err) => toast.error(err));
        return;
      }
      if (result.warnings.length > 0) {
        result.warnings.forEach((w) => toast.warning(w));
      }
      await importDictionary(result.entries, user?.email || "admin");
      toast.success(`${result.entries.length} ${t("admin.terms_imported")}`);
    };
    input.click();
  };

  const handleExport = () => {
    exportToExcel(dictionary);
  };
const CATEGORIES = ["Général", "Finance", "RH", "Commercial", "Civil", "Contact", "Géographie", "Structure", "Juridique", "Technique"];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.dictionary_title")}</h1>
          <p className="text-muted-foreground mt-1">{dictionary.length} {t("dashboard.terms")} • {filtered.length} {t("admin.displayed")}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleDeleteAll} className="gap-1" disabled={dictionary.length === 0}>
              <AlertTriangle className="h-3.5 w-3.5" /> {t("admin.delete")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleImport} className="gap-1">
              <Upload className="h-3.5 w-3.5" /> {t("admin.import_excel")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-3.5 w-3.5" /> {t("admin.export_excel")}
            </Button>
            <Button size="sm" onClick={openAdd} className="gap-1">
              <Plus className="h-3.5 w-3.5" /> {t("admin.add_term")}
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.search")}
            className="pl-9"
          />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <SelectValue placeholder={t("admin.col_category")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.all_categories")}</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Dictionary Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_source")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_abbrev")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_description_label")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_synonyms")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_category")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_updated")}</th>
                {isAdmin && <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-medium text-foreground">{entry.terme_source}</td>
                  <td className="p-3 font-mono font-semibold text-primary">{entry.abreviation}</td>
                  <td className="p-3 text-muted-foreground">{entry.description}</td>
                  <td className="p-3">
                    {entry.synonymes.map((s, i) => (
                      <span key={i} className="inline-block bg-muted text-muted-foreground text-xs px-1.5 py-0.5 rounded mr-1 mb-0.5">
                        {s}
                      </span>
                    ))}
                  </td>
                  <td className="p-3">
                    <span className="ca-badge-ok">{entry.categorie}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{entry.date_maj}</td>
                  {isAdmin && (
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>




      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t("admin.edit_title") : t("admin.add_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("admin.label_source")}</Label>
                <Input value={form.terme_source} onChange={(e) => setForm({ ...form, terme_source: e.target.value })} placeholder="montant" />
              </div>
              <div>
                <Label>{t("admin.label_abbrev")}</Label>
                <Input value={form.abreviation} onChange={(e) => setForm({ ...form, abreviation: e.target.value })} placeholder="MNT" className="font-mono" />
              </div>
            </div>
            <div>
              <Label>{t("admin.col_description_label")}</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Montant financier" />
            </div>
            <div>
              <Label>{t("admin.synonyms_label")}</Label>
              <Input value={form.synonymes} onChange={(e) => setForm({ ...form, synonymes: e.target.value })} placeholder="somme, total" />
            </div>
            <div>
              <Label>{t("admin.label_category")}</Label>
              <Select value={form.categorie} onValueChange={(v) => setForm({ ...form, categorie: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t("admin.cancel")}</Button>
            <Button onClick={handleSave} className="gap-1">
              <Check className="h-4 w-4" /> {t("admin.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
