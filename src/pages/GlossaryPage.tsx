import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/hooks/useStore";
import { Input } from "@/components/ui/input";
import { Search, BookA, Tag, Info, ArrowRight, CheckCircle2, XCircle } from "lucide-react";

export default function GlossaryPage() {
  const { dictionary } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");

  const reverseAnalysis = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const words = searchQuery.replace(/([a-z])([A-Z])/g, "$1_$2").split(/[\s_\-]+/).filter(Boolean);
    if (words.length <= 1) return null; // Only for composite words

    return words.map(word => {
      const w = word.toLowerCase();
      let match = dictionary.find(d => d.abreviation.toLowerCase() === w && d.actif);
      if (!match) {
        match = dictionary.find(d => 
          (d.terme_source.toLowerCase() === w || d.synonymes.some(s => s.toLowerCase() === w)) && d.actif
        );
      }
      return { 
        original: word, 
        translated: match ? match.terme_source : word, 
        found: !!match 
      };
    });
  }, [searchQuery, dictionary]);

  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const rawQuery = searchQuery.toLowerCase().trim();
    const queryParts = rawQuery.split(/[\s_\-]+/).filter(Boolean);
    
    let results = dictionary.filter((entry) => {
      if (!entry.actif) return false;
      const abrev = entry.abreviation.toLowerCase();
      const term = entry.terme_source.toLowerCase();
      
      if (abrev.includes(rawQuery) || term.includes(rawQuery)) return true;
      if (entry.synonymes.some((s) => s.toLowerCase().includes(rawQuery))) return true;
      
      if (queryParts.length > 1) {
        if (queryParts.includes(abrev)) return true;
        if (entry.synonymes.some(s => queryParts.includes(s.toLowerCase()))) return true;
      }
      return false;
    });

    results.sort((a, b) => {
      const abrevA = a.abreviation.toLowerCase();
      const abrevB = b.abreviation.toLowerCase();
      
      if (abrevA === rawQuery && abrevB !== rawQuery) return -1;
      if (abrevB === rawQuery && abrevA !== rawQuery) return 1;
      
      const termA = a.terme_source.toLowerCase();
      const termB = b.terme_source.toLowerCase();
      if (termA === rawQuery && termB !== rawQuery) return -1;
      if (termB === rawQuery && termA !== rawQuery) return 1;
      
      if (abrevA.startsWith(rawQuery) && !abrevB.startsWith(rawQuery)) return -1;
      if (abrevB.startsWith(rawQuery) && !abrevA.startsWith(rawQuery)) return 1;

      return 0;
    });

    return results.slice(0, 50);
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
            className="space-y-6"
          >
            {/* Reverse Analysis Banner for Composite Queries */}
            {reverseAnalysis && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-primary mb-3 uppercase tracking-wide">Traduction de la colonne</h3>
                <div className="flex flex-wrap items-center gap-3">
                  {reverseAnalysis.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg border ${part.found ? 'bg-success/10 border-success/30' : 'bg-destructive/10 border-destructive/30'}`}>
                        <span className="text-xs font-mono text-muted-foreground">{part.original}</span>
                        <div className="flex items-center gap-1 mt-0.5">
                          {part.found ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                          <span className={`font-semibold ${part.found ? 'text-success' : 'text-destructive'}`}>{part.translated}</span>
                        </div>
                      </div>
                      {idx < reverseAnalysis.length - 1 && (
                        <div className="h-[2px] w-4 bg-muted-foreground/30 rounded" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
