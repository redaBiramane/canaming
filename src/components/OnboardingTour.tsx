import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TextCursorInput, Code2, Database, Sparkles, BookOpen, ArrowRight, X, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const ONBOARDING_KEY = "ca-naming-onboarding-done";

interface Step {
  title: string;
  description: string;
  icon: typeof TextCursorInput;
  route?: string;
  color: string;
}

const steps: Step[] = [
  {
    title: "Bienvenue sur Naming Studio !",
    description: "Cette plateforme vous permet de normaliser automatiquement les noms de colonnes SQL selon le dictionnaire métier du Crédit Agricole. Faisons un tour rapide.",
    icon: Rocket,
    color: "bg-primary/15 text-primary",
  },
  {
    title: "Renommer des colonnes",
    description: "Saisissez manuellement vos noms de colonnes et obtenez leur abréviation standardisée en un clic. Idéal pour des vérifications rapides.",
    icon: TextCursorInput,
    route: "/rename",
    color: "bg-accent text-accent-foreground",
  },
  {
    title: "Analyse SQL",
    description: "Collez un script CREATE TABLE complet et tous les noms de colonnes seront transformés automatiquement. Comparez le résultat avant/après.",
    icon: Code2,
    route: "/sql",
    color: "bg-success/15 text-success",
  },
  {
    title: "Analyse DBT",
    description: "Transformez vos modèles dbt (SQL + Jinja). Le moteur préserve la syntaxe Jinja tout en renommant les colonnes.",
    icon: Database,
    route: "/dbt",
    color: "bg-warning/15 text-warning-foreground",
  },
  {
    title: "IA Naming",
    description: "Notre fonctionnalité la plus avancée ! Collez n'importe quelle requête SQL et l'IA la transforme intelligemment en utilisant le dictionnaire comme référence.",
    icon: Sparkles,
    route: "/ia-naming",
    color: "bg-primary/15 text-primary",
  },
  {
    title: "Dictionnaire",
    description: "Consultez le dictionnaire de nommage. Si un mot inconnu est détecté, vous pouvez le signaler pour qu'un admin l'ajoute au dictionnaire.",
    icon: BookOpen,
    route: "/admin",
    color: "bg-accent text-accent-foreground",
  },
];

export function OnboardingTour() {
  const [show, setShow] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) {
      // Small delay so the app loads first
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const complete = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
    if (steps[currentStep].route) {
      navigate(steps[currentStep].route!);
    }
  };

  const skip = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setShow(false);
  };

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      complete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={skip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
              {/* Skip button */}
              <div className="flex justify-end p-3 pb-0">
                <button
                  onClick={skip}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Content */}
              <div className="px-8 pb-2">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center"
                  >
                    {/* Icon */}
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${step.color} mb-5`}>
                      <step.icon className="h-8 w-8" />
                    </div>

                    {/* Text */}
                    <h2 className="text-xl font-bold text-foreground mb-2">{step.title}</h2>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      {step.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 py-5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentStep(i)}
                    className={`transition-all duration-300 rounded-full ${
                      i === currentStep
                        ? "w-6 h-2 bg-primary"
                        : i < currentStep
                        ? "w-2 h-2 bg-primary/40"
                        : "w-2 h-2 bg-muted-foreground/20"
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between px-8 pb-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prev}
                  disabled={currentStep === 0}
                  className="text-muted-foreground"
                >
                  Précédent
                </Button>

                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={skip} className="text-muted-foreground">
                    Passer
                  </Button>
                  <Button size="sm" onClick={next} className="gap-1.5">
                    {isLast ? (
                      <>
                        C'est parti ! <Rocket className="h-3.5 w-3.5" />
                      </>
                    ) : (
                      <>
                        Suivant <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
