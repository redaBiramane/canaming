import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/hooks/useStore";
import { Input } from "@/components/ui/input";
import { Search, BookA, Tag, Info } from "lucide-react";

export default function GlossaryPage() {
  const { dictionary } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    
    return dictionary.filter((entry) => {
      if (!entry.actif) return false;
      const matchAbreviation = entry.abreviation.toLowerCase().includes(query);
      const matchTerme = entry.terme_source.toLowerCase().includes(query);
      const matchSynonymes = entry.synonymes.some((s) => s.toLowerCase().includes(query));
      return matchAbreviation || matchTerme || matchSynonymes;
    }).slice(0, 50); // Limit results to 50 for performance
  }, [searchQuery, dictionary]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center space-y-4 pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary mb-2">
          <BookA className="h-8 w-8" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Glossaire Entreprise</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Recherchez la signification d'une abréviation ou trouvez comment nommer une donnée selon les standards.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Ex: MNT, Client, Taux..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-6 text-lg rounded-2xl shadow-sm border-2 focus-visible:ring-primary focus-visible:border-primary transition-all"
            autoFocus
          />
        </div>
        {!searchQuery && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Tapez au moins une lettre pour lancer la recherche dans nos {dictionary.length} termes référencés.
          </p>
        )}
      </div>

      <AnimatePresence mode="popLayout">
        {searchQuery && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid gap-4"
          >
            {filteredResults.length === 0 ? (
              <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed">
                <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">Aucun résultat trouvé</h3>
                <p className="text-muted-foreground mt-1">Essayez avec un autre mot ou un synonyme.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredResults.map((entry) => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={entry.id} 
                    className="bg-card border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 p-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                        {entry.categorie}
                      </span>
                    </div>
                    
                    <div className="space-y-3 pr-16">
                      <div>
                        <h3 className="text-2xl font-bold font-mono text-foreground tracking-tight">
                          {entry.abreviation}
                        </h3>
                        <p className="font-medium text-muted-foreground">
                          {entry.terme_source}
                        </p>
                      </div>

                      {entry.description && (
                        <div className="flex gap-2 items-start text-sm text-foreground/80 bg-muted/30 p-3 rounded-lg">
                          <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                          <p className="leading-relaxed">{entry.description}</p>
                        </div>
                      )}

                      {entry.synonymes.length > 0 && (
                        <div className="flex gap-2 items-start">
                          <Tag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex flex-wrap gap-1.5">
                            {entry.synonymes.map((syn, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded border bg-background text-muted-foreground">
                                {syn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
