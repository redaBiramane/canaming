// Supabase-backed store hook replacing localStorage
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DictionaryEntry, HistoryEntry } from "@/lib/dictionary";
import { Signalement } from "@/lib/store";

// Map DB row to DictionaryEntry
function mapDict(row: any): DictionaryEntry {
  return {
    id: row.id,
    terme_source: row.terme_source,
    abreviation: row.abreviation,
    description: row.description || "",
    synonymes: row.synonymes || [],
    categorie: row.categorie || "Général",
    actif: row.actif ?? true,
    date_maj: row.date_maj || "",
    auteur: row.auteur || "",
  };
}

function mapHistory(row: any): HistoryEntry {
  return {
    id: row.id,
    date: row.date,
    auteur: row.auteur,
    action: row.action,
    terme: row.terme || "",
    ancienne_valeur: row.ancienne_valeur,
    nouvelle_valeur: row.nouvelle_valeur,
    champ: row.champ,
    details: row.details,
  };
}

function mapSignalement(row: any): Signalement {
  return {
    id: row.id,
    mot: row.mot,
    contexte: row.contexte || "",
    date: row.date,
    auteur: row.auteur,
    statut: row.statut,
  };
}

// Default French stop words to ignore during transformation
const DEFAULT_STOP_WORDS = [
  "de", "du", "des", "le", "la", "les", "l", "un", "une",
  "et", "ou", "en", "au", "aux", "par", "pour", "sur", "avec",
  "dans", "ce", "cette", "ces", "son", "sa", "ses",
];

export function useAppStore() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // --- Queries ---
  const { data: dictionary = [] } = useQuery({
    queryKey: ["dictionary"],
    queryFn: async () => {
      // Fetch all rows using pagination to avoid the 1000-row default limit
      const allRows: any[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("dictionary")
          .select("*")
          .order("terme_source")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return allRows.map(mapDict);
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("history")
        .select("*")
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []).map(mapHistory);
    },
  });

  const { data: signalements = [] } = useQuery({
    queryKey: ["signalements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signalements")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return (data || []).map(mapSignalement);
    },
  });

  const { data: stats = { transformationCount: 0, unknownWordsCount: 0 } } = useQuery({
    queryKey: ["app_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_stats")
        .select("*")
        .eq("id", "global")
        .single();
      if (error) throw error;
      return {
        transformationCount: data?.transformation_count || 0,
        unknownWordsCount: data?.unknown_words_count || 0,
      };
    },
  });

  // --- Stop Words (stored in app_settings as JSON array) ---
  const { data: stopWords = [] } = useQuery({
    queryKey: ["stop_words"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "stop_words")
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 = not found
      if (!data) return DEFAULT_STOP_WORDS;
      try {
        const parsed = JSON.parse(data.value);
        return Array.isArray(parsed) ? parsed.map((w: string) => w.toLowerCase().trim()).filter(Boolean) : DEFAULT_STOP_WORDS;
      } catch {
        return DEFAULT_STOP_WORDS;
      }
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["dictionary"] });
    queryClient.invalidateQueries({ queryKey: ["history"] });
    queryClient.invalidateQueries({ queryKey: ["signalements"] });
    queryClient.invalidateQueries({ queryKey: ["app_stats"] });
    queryClient.invalidateQueries({ queryKey: ["stop_words"] });
  };

  // --- Mutations ---
  const addEntry = async (entry: Omit<DictionaryEntry, "id" | "date_maj">) => {
    const { error } = await supabase.from("dictionary").insert({
      terme_source: entry.terme_source,
      abreviation: entry.abreviation,
      description: entry.description,
      synonymes: entry.synonymes,
      categorie: entry.categorie,
      actif: entry.actif,
      auteur: entry.auteur,
    });
    if (error) throw error;
    await supabase.from("history").insert({
      auteur: entry.auteur,
      action: "ajout",
      terme: entry.terme_source,
      nouvelle_valeur: entry.abreviation,
      user_id: user?.id,
    });
    invalidateAll();
  };

  const updateEntry = async (id: string, updates: Partial<DictionaryEntry>, auteur: string) => {
    const old = dictionary.find((e) => e.id === id);
    const { error } = await supabase.from("dictionary").update({
      ...(updates.terme_source !== undefined && { terme_source: updates.terme_source }),
      ...(updates.abreviation !== undefined && { abreviation: updates.abreviation }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.synonymes !== undefined && { synonymes: updates.synonymes }),
      ...(updates.categorie !== undefined && { categorie: updates.categorie }),
      ...(updates.actif !== undefined && { actif: updates.actif }),
      auteur,
      date_maj: new Date().toISOString().split("T")[0],
    }).eq("id", id);
    if (error) throw error;
    await supabase.from("history").insert({
      auteur,
      action: "modification",
      terme: old?.terme_source || "",
      ancienne_valeur: old?.abreviation,
      nouvelle_valeur: updates.abreviation || old?.abreviation,
      champ: Object.keys(updates).join(", "),
      user_id: user?.id,
    });
    invalidateAll();
  };

  const deleteEntry = async (id: string, auteur: string) => {
    const old = dictionary.find((e) => e.id === id);
    const { error } = await supabase.from("dictionary").delete().eq("id", id);
    if (error) throw error;
    await supabase.from("history").insert({
      auteur,
      action: "suppression",
      terme: old?.terme_source || "",
      ancienne_valeur: old?.abreviation,
      user_id: user?.id,
    });
    invalidateAll();
  };

  const importDictionary = async (entries: DictionaryEntry[], auteur: string) => {
    // Delete all existing entries first, then insert new ones
    await supabase.from("dictionary").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    
    // Insert in batches of 500
    for (let i = 0; i < entries.length; i += 500) {
      const batch = entries.slice(i, i + 500).map((e) => ({
        terme_source: e.terme_source,
        abreviation: e.abreviation,
        description: e.description,
        synonymes: e.synonymes,
        categorie: e.categorie,
        actif: e.actif,
        auteur: e.auteur || auteur,
      }));
      await supabase.from("dictionary").insert(batch);
    }
    
    await supabase.from("history").insert({
      auteur,
      action: "import",
      terme: `${entries.length} termes importés`,
      user_id: user?.id,
    });
    invalidateAll();
  };

  const incrementTransformations = async (count: number = 1, unknowns: number = 0) => {
    // Use RPC or direct update
    const { data: current } = await supabase
      .from("app_stats")
      .select("*")
      .eq("id", "global")
      .single();
    
    if (current) {
      await supabase.from("app_stats").update({
        transformation_count: (current.transformation_count || 0) + count,
        unknown_words_count: (current.unknown_words_count || 0) + unknowns,
      }).eq("id", "global");
    }
    queryClient.invalidateQueries({ queryKey: ["app_stats"] });
  };

  const addHistoryEntry = async (entry: Omit<HistoryEntry, "id" | "date">) => {
    await supabase.from("history").insert({
      auteur: entry.auteur,
      action: entry.action,
      terme: entry.terme,
      ancienne_valeur: entry.ancienne_valeur,
      nouvelle_valeur: entry.nouvelle_valeur,
      champ: entry.champ,
      details: entry.details ? JSON.parse(JSON.stringify(entry.details)) : null,
      user_id: user?.id,
    });
    queryClient.invalidateQueries({ queryKey: ["history"] });
  };

  const deleteHistoryEntry = async (id: string) => {
    await supabase.from("history").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["history"] });
  };

  const signalerMot = async (mot: string, contexte: string, auteur: string = "utilisateur") => {
    // Check for existing pending signalement
    if (signalements.some((s) => s.mot === mot && s.statut === "en_attente")) return;
    
    await supabase.from("signalements").insert({
      mot,
      contexte,
      auteur,
      user_id: user?.id,
    });
    await supabase.from("history").insert({
      auteur,
      action: "signalement",
      terme: mot,
      nouvelle_valeur: `Contexte: ${contexte}`,
      user_id: user?.id,
    });

    // Notify all admins about the new signalement
    const { data: adminIds } = await supabase.rpc("get_admin_user_ids");
    if (adminIds && adminIds.length > 0) {
      const notifications = (adminIds as string[])
        .filter((id) => id !== user?.id) // Don't notify yourself
        .map((id) => ({
          user_id: id,
          title: "Nouveau signalement 🚩",
          message: `Le mot "${mot}" a été signalé par ${auteur} (contexte: ${contexte}).`,
          type: "info",
        }));
      if (notifications.length > 0) {
        await supabase.from("notifications").insert(notifications);
      }
    }

    // Send email notification to configured addresses
    try {
      await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mot, contexte, auteur }),
      });
    } catch (e) {
      console.error("Email notification failed:", e);
    }

    invalidateAll();
  };

  const updateSignalement = async (id: string, statut: Signalement["statut"]) => {
    await supabase.from("signalements").update({ statut }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["signalements"] });
  };

  // --- Stop words management ---
  const saveStopWords = async (words: string[]) => {
    const normalized = [...new Set(words.map((w) => w.toLowerCase().trim()).filter(Boolean))].sort();
    const value = JSON.stringify(normalized);
    // Upsert: try update first, then insert if not found
    const { data: existing } = await supabase
      .from("app_settings")
      .select("key")
      .eq("key", "stop_words")
      .single();
    if (existing) {
      await supabase.from("app_settings").update({ value }).eq("key", "stop_words");
    } else {
      await supabase.from("app_settings").insert({ key: "stop_words", value });
    }
    queryClient.invalidateQueries({ queryKey: ["stop_words"] });
  };

  const addStopWord = async (word: string) => {
    const normalized = word.toLowerCase().trim();
    if (!normalized || stopWords.includes(normalized)) return;
    await saveStopWords([...stopWords, normalized]);
  };

  const removeStopWord = async (word: string) => {
    await saveStopWords(stopWords.filter((w: string) => w !== word.toLowerCase().trim()));
  };

  return {
    dictionary,
    history,
    signalements,
    stopWords,
    transformationCount: stats.transformationCount,
    unknownWordsCount: stats.unknownWordsCount,
    addEntry,
    updateEntry,
    deleteEntry,
    importDictionary,
    incrementTransformations,
    addHistoryEntry,
    deleteHistoryEntry,
    signalerMot,
    updateSignalement,
    saveStopWords,
    addStopWord,
    removeStopWord,
  };
}
