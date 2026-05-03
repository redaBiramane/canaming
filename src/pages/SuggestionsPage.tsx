import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Plus, ThumbsUp, MessageSquare, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useI18nStore } from "@/lib/i18n";

interface Suggestion {
  id: string;
  titre: string;
  description: string;
  auteur: string;
  statut: 'nouveau' | 'en_cours' | 'accepte' | 'refuse';
  votes: number;
  created_at: string;
}

export default function SuggestionsPage() {
  const { user, role } = useAuth();
  const { t, lang } = useI18nStore();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  
  // Form state
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Track voted suggestions to prevent duplicate votes
  const [votedIds, setVotedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('ca-naming-voted-suggestions');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const markAsVoted = (id: string) => {
    const updated = new Set(votedIds);
    updated.add(id);
    setVotedIds(updated);
    localStorage.setItem('ca-naming-voted-suggestions', JSON.stringify([...updated]));
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suggestions')
      .select('*')
      .order('votes', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      if (error.code === '42P01' || error.code === 'PGRST205') {
        setTableMissing(true);
      }
      setSuggestions([]);
    } else {
      setSuggestions(data || []);
      setTableMissing(false);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titre.trim() || !description.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from('suggestions').insert({
      titre: titre.trim(),
      description: description.trim(),
      auteur: user?.email || 'Anonyme',
    });

    if (error) {
      console.error("Insert error:", error);
      toast.error(t("admin.toast_error") + ` (${error.code}): ${error.message}`);
    } else {
      toast.success(t("admin.suggestion_sent"));
      setIsDialogOpen(false);
      setTitre("");
      setDescription("");
      fetchSuggestions();

      // Notify all admins about the new suggestion
      const { data: adminIds } = await supabase.rpc("get_admin_user_ids");
      if (adminIds && adminIds.length > 0) {
        const notifications = (adminIds as string[])
          .filter((id) => id !== user?.id) // Don't notify yourself
          .map((id) => ({
            user_id: id,
            title: t("admin.notification_new_suggestion_title") || "Nouvelle idée 💡",
            message: (t("admin.notification_new_suggestion_message") || "L'idée \"{title}\" a été proposée par {author}.")
              .replace("{title}", titre.trim())
              .replace("{author}", user?.email || "Anonyme"),
            type: "info",
          }));
        if (notifications.length > 0) {
          await supabase.from("notifications").insert(notifications);
        }
      }
    }
    setSubmitting(false);
  };

  const handleVote = async (id: string, currentVotes: number) => {
    // Prevent duplicate votes
    if (votedIds.has(id)) {
      toast.info(t("admin.already_voted"));
      return;
    }

    const { data, error } = await supabase
      .from('suggestions')
      .update({ votes: currentVotes + 1 })
      .eq('id', id)
      .select();

    if (error) {
      console.error("Vote error:", error);
      toast.error(t("admin.toast_error") + ` (${error.code}): ${error.message}`);
    } else if (!data || data.length === 0) {
      toast.error(t("admin.toast_error"));
    } else {
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, votes: currentVotes + 1 } : s));
      markAsVoted(id);
      toast.success(t("admin.toast_saved"));
    }
  };

  const updateStatus = async (id: string, newStatus: Suggestion['statut']) => {
    if (role !== 'admin') return;
    const { error } = await supabase
      .from('suggestions')
      .update({ statut: newStatus })
      .eq('id', id);

    if (error) {
      toast.error(t("admin.toast_error"));
    } else {
      setSuggestions(suggestions.map(s => s.id === id ? { ...s, statut: newStatus } : s));
      toast.success(t("admin.toast_saved"));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'nouveau': return <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"><Lightbulb className="w-3 h-3" /> {t("admin.status_new")}</span>;
      case 'en_cours': return <span className="bg-warning/10 text-warning-foreground px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> {t("admin.status_in_progress")}</span>;
      case 'accepte': return <span className="bg-success/10 text-success px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t("admin.status_accepted")}</span>;
      case 'refuse': return <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> {t("admin.status_rejected")}</span>;
      default: return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.suggestions_title")}</h1>
          <p className="text-muted-foreground mt-1">{t("admin.suggestions_desc")}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={tableMissing}>
              <Plus className="w-4 h-4" /> {t("admin.propose_idea")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("admin.new_suggestion")}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("admin.idea_title")}</label>
                <Input 
                  value={titre} 
                  onChange={e => setTitre(e.target.value)} 
                  placeholder={t("admin.idea_placeholder")}
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("admin.idea_desc")}</label>
                <Textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder={t("admin.idea_desc_placeholder")}
                  className="h-32 resize-none"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "..." : t("admin.submit_suggestion")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tableMissing && role === 'admin' && (
        <div className="bg-destructive/10 border-l-4 border-destructive p-4 rounded-lg my-4">
          <h3 className="text-destructive font-bold mb-2">Configuration requise !</h3>
          <p className="text-sm text-foreground mb-4">
            La table <code>suggestions</code> n'existe pas encore dans votre base de données Supabase.
            Veuillez exécuter le script SQL suivant dans le SQL Editor de Supabase :
          </p>
          <pre className="bg-card border p-4 rounded text-xs font-mono overflow-x-auto text-foreground">
{`CREATE TABLE suggestions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT NOT NULL,
  auteur TEXT NOT NULL,
  statut TEXT DEFAULT 'nouveau',
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les suggestions" ON suggestions FOR SELECT USING (true);
CREATE POLICY "Les utilisateurs connectés peuvent créer" ON suggestions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Les utilisateurs peuvent voter" ON suggestions FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Les admins peuvent tout faire" ON suggestions FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin')
);`}
          </pre>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t("dashboard.no_data") || "..."}</div>
      ) : tableMissing && role !== 'admin' ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium">{t("admin.coming_soon")}</h3>
          <p className="text-muted-foreground text-sm mt-1">{t("admin.setup_in_progress")}</p>
        </div>
      ) : suggestions.length === 0 && !tableMissing ? (
        <div className="text-center py-12 bg-card border rounded-xl">
          <Lightbulb className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium">{t("admin.no_ideas")}</h3>
          <p className="text-muted-foreground text-sm mt-1">{t("admin.be_first")}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {suggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Vote column */}
                  <div className="flex flex-col items-center gap-2">
                    <Button 
                      variant={votedIds.has(suggestion.id) ? "default" : "outline"}
                      size="icon" 
                      className={`w-10 h-10 rounded-full transition-colors ${
                        votedIds.has(suggestion.id)
                          ? "bg-primary text-primary-foreground cursor-default"
                          : "hover:text-primary hover:border-primary"
                      }`}
                      onClick={() => handleVote(suggestion.id, suggestion.votes)}
                      disabled={votedIds.has(suggestion.id)}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </Button>
                    <span className="font-bold text-lg">{suggestion.votes}</span>
                  </div>

                  {/* Content column */}
                  <div className="flex-1 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{suggestion.titre}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t("admin.proposed_by").replace("{author}", suggestion.auteur)} {new Date(suggestion.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(suggestion.statut)}
                        
                        {/* Admin controls */}
                        {role === 'admin' && (
                          <select 
                            className="text-xs bg-muted border rounded p-1 ml-2"
                            value={suggestion.statut}
                            onChange={(e) => updateStatus(suggestion.id, e.target.value as any)}
                          >
                            <option value="nouveau">{t("admin.status_new")}</option>
                            <option value="en_cours">{t("admin.status_in_progress")}</option>
                            <option value="accepte">{t("admin.status_accepted")}</option>
                            <option value="refuse">{t("admin.status_rejected")}</option>
                          </select>
                        )}
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-sm text-foreground whitespace-pre-wrap">{suggestion.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
