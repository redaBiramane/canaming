import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BookOpen, ArrowRightLeft, AlertTriangle, HelpCircle, Clock, TrendingUp,
  Users, Flag, BarChart3,
} from "lucide-react";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["hsl(152, 55%, 28%)", "hsl(38, 92%, 50%)", "hsl(0, 65%, 52%)", "hsl(210, 15%, 50%)", "hsl(152, 60%, 40%)", "hsl(270, 50%, 50%)", "hsl(200, 60%, 45%)", "hsl(30, 70%, 50%)"];

export default function DashboardPage() {
  const { dictionary, history, signalements, transformationCount, unknownWordsCount } = useAppStore();
  const { role } = useAuth();
  const isAdmin = role === "admin";

  const categories = [...new Set(dictionary.map((d) => d.categorie))];
  const matchRate = transformationCount > 0
    ? Math.round(((transformationCount - unknownWordsCount) / transformationCount) * 100)
    : 100;

  // Category chart data
  const categoryData = useMemo(() =>
    categories.map((cat) => ({
      name: cat,
      count: dictionary.filter((d) => d.categorie === cat).length,
    })).sort((a, b) => b.count - a.count),
    [dictionary, categories]
  );

  // Signalement stats
  const signalementStats = useMemo(() => [
    { name: "En attente", value: signalements.filter((s) => s.statut === "en_attente").length },
    { name: "Traités", value: signalements.filter((s) => s.statut === "traité").length },
    { name: "Rejetés", value: signalements.filter((s) => s.statut === "rejeté").length },
  ], [signalements]);

  // Unique users from history
  const uniqueUsers = useMemo(() => {
    const users = new Set(history.map((h) => h.auteur));
    return [...users];
  }, [history]);

  // Transformations per user
  const userTransformations = useMemo(() => {
    const map: Record<string, number> = {};
    history.filter((h) => h.action === "transformation").forEach((h) => {
      map[h.auteur] = (map[h.auteur] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.split("@")[0], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [history]);

  // Activity over last 7 days
  const activityData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      days[key] = 0;
    }
    history.forEach((h) => {
      const key = new Date(h.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
      if (key in days) days[key]++;
    });
    return Object.entries(days).map(([date, actions]) => ({ date, actions }));
  }, [history]);

  // Signalements per user
  const signalementsByUser = useMemo(() => {
    const map: Record<string, number> = {};
    signalements.forEach((s) => {
      map[s.auteur] = (map[s.auteur] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.split("@")[0], count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [signalements]);

  const stats = [
    { label: "Termes dans le dictionnaire", value: dictionary.length, icon: BookOpen, color: "text-primary" },
    { label: "Transformations réalisées", value: transformationCount, icon: ArrowRightLeft, color: "text-primary" },
    { label: "Taux de correspondance", value: `${matchRate}%`, icon: TrendingUp, color: "text-success" },
    { label: "Mots inconnus rencontrés", value: unknownWordsCount, icon: HelpCircle, color: "text-warning" },
    ...(isAdmin ? [
      { label: "Utilisateurs actifs", value: uniqueUsers.length, icon: Users, color: "text-primary" },
      { label: "Signalements", value: signalements.length, icon: Flag, color: "text-warning" },
    ] : [
      { label: "Catégories", value: categories.length, icon: AlertTriangle, color: "text-primary" },
      { label: "Modifications récentes", value: history.length, icon: Clock, color: "text-muted-foreground" },
    ]),
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "Vue d'ensemble administrateur" : "Vue d'ensemble de la plateforme de normalisation"}
        </p>
      </div>

      {/* Stats */}
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

      {/* Admin charts */}
      {isAdmin && (
        <>
          {/* Row 1: Activity + Signalements pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="ca-card p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Activité des 7 derniers jours
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 89%)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(210, 10%, 50%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(210, 10%, 50%)" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(150, 12%, 89%)", borderRadius: 8, fontSize: 13 }}
                  />
                  <Line type="monotone" dataKey="actions" stroke="hsl(152, 55%, 28%)" strokeWidth={2} dot={{ r: 4 }} name="Actions" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="ca-card p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Flag className="h-4 w-4 text-warning" />
                Signalements par statut
              </h2>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={signalementStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {signalementStats.map((_, i) => (
                      <Cell key={i} fill={[
                        "hsl(38, 92%, 50%)",
                        "hsl(152, 60%, 40%)",
                        "hsl(0, 65%, 52%)",
                      ][i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>

          {/* Row 2: Transformations per user + Signalements per user */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="ca-card p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Transformations par utilisateur
              </h2>
              {userTransformations.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={userTransformations} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 89%)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210, 10%, 50%)" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(210, 10%, 50%)" width={100} />
                    <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(150, 12%, 89%)", borderRadius: 8, fontSize: 13 }} />
                    <Bar dataKey="count" fill="hsl(152, 55%, 28%)" radius={[0, 4, 4, 0]} name="Transformations" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="ca-card p-5">
              <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Flag className="h-4 w-4 text-warning" />
                Signalements par utilisateur
              </h2>
              {signalementsByUser.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={signalementsByUser} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 89%)" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(210, 10%, 50%)" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="hsl(210, 10%, 50%)" width={100} />
                    <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(150, 12%, 89%)", borderRadius: 8, fontSize: 13 }} />
                    <Bar dataKey="count" fill="hsl(38, 92%, 50%)" radius={[0, 4, 4, 0]} name="Signalements" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
              )}
            </motion.div>
          </div>

          {/* Users list */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="ca-card p-5">
            <h2 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Utilisateurs actifs
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium text-muted-foreground">Utilisateur</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Transformations</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Signalements</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueUsers.map((u) => {
                    const userHistory = history.filter((h) => h.auteur === u);
                    const transforms = userHistory.filter((h) => h.action === "transformation").length;
                    const signals = signalements.filter((s) => s.auteur === u).length;
                    const lastActivity = userHistory[0]?.date;
                    return (
                      <tr key={u} className="border-t hover:bg-muted/50 transition-colors">
                        <td className="p-3 font-medium text-foreground">{u}</td>
                        <td className="p-3">
                          <span className="ca-badge-ok">{transforms}</span>
                        </td>
                        <td className="p-3">
                          <span className={signals > 0 ? "ca-badge-warning" : "ca-badge-unknown"}>{signals}</span>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {lastActivity ? new Date(lastActivity).toLocaleDateString("fr-FR", {
                            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                          }) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {/* Categories breakdown */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isAdmin ? 0.35 : 0.1 }} className="ca-card p-5">
        <h2 className="font-semibold text-foreground mb-3">Répartition par catégorie</h2>
        {isAdmin ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(150, 12%, 89%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(210, 10%, 50%)" angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(210, 10%, 50%)" allowDecimals={false} />
              <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(150, 12%, 89%)", borderRadius: 8, fontSize: 13 }} />
              <Bar dataKey="count" fill="hsl(152, 55%, 28%)" radius={[4, 4, 0, 0]} name="Termes" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
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
        )}
      </motion.div>

      {/* Recent dictionary (non-admin) */}
      {!isAdmin && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="ca-card p-5">
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
      )}
    </div>
  );
}
