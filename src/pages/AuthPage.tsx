import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import logoCA from "@/assets/logo-ca.png";
import { useI18nStore } from "@/lib/i18n";

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const { t, lang } = useI18nStore();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t("auth.toast_login_success"));
      }
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t("auth.toast_signup_success"));
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logoCA} alt="CA Personal Finance & Mobility" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t("sidebar.app_name")}</h1>
          <p className="text-muted-foreground mt-1">{t("auth.subtitle")}</p>
        </div>

        {/* Card */}
        <div className="ca-card p-6 space-y-6">
          {/* Tabs */}
          <div className="flex rounded-lg bg-muted p-1">
            <button
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                mode === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setMode("login")}
            >
              {t("auth.login_tab")}
            </button>
            <button
              className={`flex-1 text-sm font-medium py-2 rounded-md transition-colors ${
                mode === "signup" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
              onClick={() => setMode("signup")}
            >
              {t("auth.signup_tab")}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="displayName">{t("auth.label_fullname")}</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t("auth.placeholder_fullname")}
                  required
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">{t("auth.label_email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("auth.placeholder_email")}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">{t("auth.label_password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full gap-2" disabled={loading}>
              {loading ? (
                <div className="h-4 w-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : mode === "login" ? (
                <>
                  <LogIn className="h-4 w-4" /> {t("auth.btn_login")}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> {t("auth.btn_signup")}
                </>
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground">
            {mode === "login"
              ? t("auth.no_account")
              : t("auth.already_account")}
            <button
              className="text-primary hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? t("auth.link_signup") : t("auth.link_login")}
            </button>
          </p>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          {t("auth.footer")}
        </p>
      </motion.div>
    </div>
  );
}
