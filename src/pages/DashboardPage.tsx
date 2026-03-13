import { motion } from "framer-motion";
import { BookOpen, ArrowRightLeft, AlertTriangle, HelpCircle, Clock, TrendingUp } from "lucide-react";
import { useAppStore } from "@/hooks/useStore";

export default function DashboardPage() {
  const { dictionary, history, transformationCount, unknownWordsCount } = useAppStore();
  const activeDictionary = dictionary.filter((d) => d.actif);
  const categories = [...new Set(dictionary.map((d) => d.categorie))];
  const matchRate = transformationCount > 0
    ? Math.round(((transformationCount - unknownWordsCount) / transformationCount) * 100)
    : 100;

  const stats = [
    { label: "Termes dans le dictionnaire", value: dictionary.length, icon: BookOpen, color: "text-primary" },
    { label: "Transformations réalisées", value: transformationCount, icon: ArrowRightLeft, color: "text-primary" },
    { label: "Taux de correspondance", value: `${matchRate}%`, icon: TrendingUp, color: "text-success" },
    { label: "Mots inconnus rencontrés", value: unknownWordsCount, icon: HelpCircle, color: "text-warning" },
    { label: "Catégories", value: categories.length, icon: AlertTriangle, color: "text-primary" },
    { label: "Modifications récentes", value: history.length, icon: Clock, color: "text-muted-foreground" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de la plateforme de normalisation</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {stats.map((s, i) => (
          <div key={i} className="ca-stat-card">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Recent dictionary entries */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="ca-card p-5">
        <h2 className="font-semibold text-foreground mb-3">Derniers termes ajoutés</h2>
        <div className="flex flex-wrap gap-2">
          {dictionary.slice(-15).reverse().map((e) => (
            <span key={e.id} className="inline-flex items-center gap-1 bg-muted text-foreground px-3 py-1.5 rounded-lg text-sm">
              <span className="text-muted-foreground">{e.terme_source}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono font-semibold text-primary">{e.abreviation}</span>
            </span>
          ))}
        </div>
      </motion.div>

      {/* Categories breakdown */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="ca-card p-5">
        <h2 className="font-semibold text-foreground mb-3">Répartition par catégorie</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const count = dictionary.filter((d) => d.categorie === cat).length;
            return (
              <div key={cat} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm text-foreground">{cat}</span>
                <span className="text-sm font-semibold text-primary">{count}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
