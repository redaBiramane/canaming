import { Button } from "@/components/ui/button";
import { useI18nStore } from "@/lib/i18n";

export function LangToggle() {
  const { lang, setLang } = useI18nStore();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs font-semibold px-2 py-1 h-8 rounded-full border border-border"
      onClick={() => setLang(lang === "fr" ? "en" : "fr")}
    >
      {lang === "fr" ? "🇬🇧 EN" : "🇫🇷 FR"}
    </Button>
  );
}
