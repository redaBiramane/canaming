import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TextCursorInput, Code2, BookOpen, ArrowRight, Columns3, FileDown, Eye, Search, Database, FileCode2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/useStore";
import { useAuth } from "@/hooks/useAuth";
import { useI18nStore } from "@/lib/i18n";

export default function HomePage() {
  const navigate = useNavigate();
  const { dictionary, transformationCount } = useAppStore();
  const { t } = useI18nStore();

  const features = [
    { icon: TextCursorInput, title: t("landing.feature_1_title"), desc: t("landing.feature_1_desc"), onClick: () => navigate("/rename") },
    { icon: Code2, title: t("landing.feature_2_title"), desc: t("landing.feature_2_desc"), onClick: () => navigate("/sql") },
    { icon: Database, title: t("landing.feature_3_title"), desc: t("landing.feature_3_desc"), onClick: () => navigate("/dbt") },
    { icon: FileCode2, title: t("landing.feature_4_title"), desc: t("landing.feature_4_desc"), onClick: () => navigate("/sas") },
    { icon: Lightbulb, title: t("sidebar.suggestions"), desc: "Proposez de nouvelles fonctionnalités", onClick: () => navigate("/suggestions") },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center space-y-4 pt-8"
      >
        <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-medium">
          <Columns3 className="h-4 w-4" />
          {dictionary.length} {t("landing.hero_badge")}
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground whitespace-pre-line">
          {t("landing.hero_title_1")}<br />{t("landing.hero_title_2")}
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {t("landing.hero_subtitle")}
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Button size="lg" onClick={() => navigate("/rename")} className="gap-2">
            <TextCursorInput className="h-4 w-4" />
            {t("sidebar.rename")}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate("/admin")} className="gap-2">
            <BookOpen className="h-4 w-4" />
            {t("sidebar.dictionary")}
          </Button>
        </div>
      </motion.div>

      {/* Features grid */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {features.map((f, i) => (
          <div key={i} className="ca-card p-5 space-y-3 cursor-pointer hover:border-primary/50" onClick={f.onClick}>
            <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
              <f.icon className="h-5 w-5 text-accent-foreground" />
            </div>
            <h3 className="font-semibold text-foreground">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </motion.div>

      {/* Quick example */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="ca-card p-6"
      >
        <h2 className="font-semibold text-lg mb-4 text-foreground">{t("landing.example_title")}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t("landing.example_before")}</p>
            <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-1">
              <p>code_salaire_montant</p>
              <p>date_naissance_client</p>
              <p>numero_agence_client</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{t("landing.example_after")}</p>
            <div className="bg-accent rounded-lg p-4 font-mono text-sm space-y-1 text-accent-foreground">
              <p>COD_SAL_MNT <span className="ca-badge-ok">OK</span></p>
              <p>DAT_NAIS_CLT <span className="ca-badge-ok">OK</span></p>
              <p>NUM_AGC_CLT <span className="ca-badge-ok">OK</span></p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pb-8">
        <div className="ca-stat-card">
          <div className="text-3xl font-bold text-primary">{dictionary.length}</div>
          <div className="text-sm text-muted-foreground">{t("landing.stat_1")}</div>
        </div>
        <div className="ca-stat-card">
          <div className="text-3xl font-bold text-primary">{transformationCount}</div>
          <div className="text-sm text-muted-foreground">{t("landing.stat_2")}</div>
        </div>
        <div className="ca-stat-card">
          <div className="text-3xl font-bold text-primary">
            {dictionary.filter(d => d.actif).length}
          </div>
          <div className="text-sm text-muted-foreground">{t("landing.stat_3")}</div>
        </div>
      </div>
    </div>
  );
}
