import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TextCursorInput, Code2, BookOpen, LogIn, Columns3, FileDown, Eye, Database, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/useStore";
import { useI18nStore } from "@/lib/i18n";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LangToggle } from "@/components/LangToggle";
import logoCA from "@/assets/logo-ca.png";

export default function LandingPage() {
  const navigate = useNavigate();
  const { dictionary, transformationCount } = useAppStore();
  const { t, lang } = useI18nStore();

  const features = [
    { icon: TextCursorInput, title: t("landing.feature_1_title"), desc: t("landing.feature_1_desc") },
    { icon: Code2, title: t("landing.feature_2_title"), desc: t("landing.feature_2_desc") },
    { icon: Database, title: t("landing.feature_3_title"), desc: t("landing.feature_3_desc") },
    { icon: FileCode2, title: t("landing.feature_4_title"), desc: t("landing.feature_4_desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="h-16 border-b bg-card px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src={logoCA} alt="CA Personal Finance & Mobility" className="h-10 w-auto" />
          <span className="font-semibold text-foreground tracking-wide ml-2 border-l pl-4 border-border hidden sm:inline-block">
            {t("sidebar.app_name")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <LangToggle />
          <ThemeToggle />
          <Button onClick={() => navigate("/login")} className="gap-2">
            <LogIn className="h-4 w-4" />
            {t("landing.login")}
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto space-y-10 p-6 pb-20">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4 pt-12"
        >
          <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-4 py-1.5 rounded-full text-sm font-medium">
            <Columns3 className="h-4 w-4" />
            1 800+ {t("landing.hero_badge")}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight whitespace-pre-line">
            {t("landing.hero_title_1")}<br />{t("landing.hero_title_2")}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t("landing.hero_subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
            <Button size="lg" onClick={() => navigate("/login")} className="gap-2">
              <LogIn className="h-4 w-4" />
              {t("landing.btn_login")}
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="gap-2">
              <BookOpen className="h-4 w-4" />
              {t("landing.btn_dictionary")}
            </Button>
          </div>
        </motion.div>

        {/* Features grid */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-8"
        >
          {features.map((f, i) => (
            <div key={i} className="bg-card border rounded-xl p-5 space-y-3 shadow-sm hover:shadow-md transition-shadow">
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
          className="bg-card border rounded-xl p-6 shadow-sm"
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
                <p>COD_SAL_MNT <span className="bg-success text-success-foreground px-1.5 py-0.5 rounded text-[10px] font-bold ml-2">OK</span></p>
                <p>DAT_NAIS_CLT <span className="bg-success text-success-foreground px-1.5 py-0.5 rounded text-[10px] font-bold ml-2">OK</span></p>
                <p>NUM_AGC_CLT <span className="bg-success text-success-foreground px-1.5 py-0.5 rounded text-[10px] font-bold ml-2">OK</span></p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8">
          <div className="bg-card border rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-primary">1 832</div>
            <div className="text-sm text-muted-foreground mt-1">{t("landing.stat_1")}</div>
          </div>
          <div className="bg-card border rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-primary">1 087</div>
            <div className="text-sm text-muted-foreground mt-1">{t("landing.stat_2")}</div>
          </div>
          <div className="bg-card border rounded-xl p-6 text-center shadow-sm">
            <div className="text-3xl font-bold text-primary">
              1 510
            </div>
            <div className="text-sm text-muted-foreground mt-1">{t("landing.stat_3")}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
