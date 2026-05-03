import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TextCursorInput, Code2, BookOpen, Flag, History, Settings, BarChart3,
  Upload, Download, Search, Plus, Pencil, Trash2, CheckCircle2, XCircle,
  RotateCcw, FileDown, ShieldCheck, Users, ArrowRight, Home, LogIn,
  Workflow, Filter, SearchCode, Replace, AlertTriangle
} from "lucide-react";
import { useI18nStore } from "@/lib/i18n";

const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 } };

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <motion.div {...fadeIn}>
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mt-0.5">{n}</span>
      <div>{children}</div>
    </div>
  );
}

function FeatureBadge({ children }: { children: React.ReactNode }) {
  return <Badge variant="secondary" className="text-xs">{children}</Badge>;
}

function UserGuide() {
  const { t, lang } = useI18nStore();
  return (
    <div className="space-y-6">
      <Section icon={Home} title={t("docs.section_home")}>
        <p>{t("docs.section_home_desc")}</p>
        <div className="flex gap-2 flex-wrap">
          <FeatureBadge>{t("docs.feature_shortcuts")}</FeatureBadge>
          <FeatureBadge>{t("docs.feature_summary")}</FeatureBadge>
        </div>
      </Section>

      <Section icon={TextCursorInput} title={t("docs.section_rename")}>
        <p>{t("docs.section_rename_desc")}</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>{t("docs.step_rename_1")}</Step>
          <Step n={2}>{t("docs.step_rename_2")}</Step>
          <Step n={3}>{t("docs.step_rename_3")}</Step>
          <Step n={4}>{t("docs.step_rename_4")}</Step>
          <Step n={5}>{t("docs.step_rename_5")}</Step>
        </div>
        <div className="mt-3 p-3 bg-muted rounded-lg">
          <p className="font-medium text-foreground mb-1">{t("docs.legend_title")}</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-500" /> {t("docs.legend_green")}</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-500" /> {t("docs.legend_yellow")}</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> {t("docs.legend_red")}</li>
          </ul>
        </div>
      </Section>

      <Section icon={Code2} title={t("docs.section_sql")}>
        <p>{t("docs.section_sql_desc")}</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>{t("docs.step_sql_1")}</Step>
          <Step n={2}>{t("docs.step_sql_2")}</Step>
          <Step n={3}>{t("docs.step_sql_3")}</Step>
          <Step n={4}>{t("docs.step_sql_4")}</Step>
          <Step n={5}>{t("docs.step_sql_5")}</Step>
        </div>
      </Section>

      <Section icon={BarChart3} title={t("docs.section_dashboard")}>
        <p>{t("docs.section_dashboard_desc")}</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>{t("docs.stat_total_terms")}</li>
          <li>{t("docs.stat_pending_reports")}</li>
          <li>{t("docs.stat_usage")}</li>
          <li>{t("docs.stat_categories")}</li>
        </ul>
      </Section>

      <Section icon={Flag} title={t("docs.section_report")}>
        <p>{t("docs.section_report_desc")}</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>{t("docs.step_report_1")}</Step>
          <Step n={2}>{t("docs.step_report_2")}</Step>
          <Step n={3}>{t("docs.step_report_3")}</Step>
        </div>
      </Section>

      <Section icon={FileDown} title={t("docs.section_export")}>
        <p>{t("docs.section_export_desc")}</p>
      </Section>
    </div>
  );
}

function AdminGuide() {
  const { t, lang } = useI18nStore();
  return (
    <div className="space-y-6">
      <Section icon={ShieldCheck} title={t("docs.section_roles")}>
        <p>{t("docs.section_roles_desc")}</p>
        <div className="mt-2 overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">{t("docs.col_feature")}</th>
                <th className="text-center p-3 font-medium">{t("docs.col_user")}</th>
                <th className="text-center p-3 font-medium">{t("docs.col_admin")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                [t("docs.role_rename"), true, true],
                [t("docs.role_sql"), true, true],
                [t("docs.role_dashboard"), true, true],
                [t("docs.role_report"), true, true],
                [t("docs.role_export"), true, true],
                [t("docs.role_dictionary"), true, true],
                [t("docs.role_manage_terms"), false, true],
                [t("docs.role_import_export"), false, true],
                [t("docs.role_manage_reports"), false, true],
                [t("docs.role_history"), false, true],
                [t("docs.role_settings"), false, true],
              ].map(([label, user, admin], i) => (
                <tr key={i} className="border-t">
                  <td className="p-3">{label as string}</td>
                  <td className="p-3 text-center">{user ? <CheckCircle2 className="h-4 w-4 text-green-600 inline" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 inline" />}</td>
                  <td className="p-3 text-center">{admin ? <CheckCircle2 className="h-4 w-4 text-green-600 inline" /> : <XCircle className="h-4 w-4 text-muted-foreground/40 inline" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section icon={Workflow} title={t("docs.section_engine")}>
        <p>{t("docs.section_engine_desc")}</p>
        
        <div className="mt-4 space-y-4">
          <div className="flex gap-4 p-4 border rounded-lg bg-card items-start relative overflow-hidden shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            <div className="bg-primary/10 p-2 rounded-lg text-primary mt-1">
              <Filter className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("docs.engine_step_1_title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t("docs.engine_step_1_desc")}</p>
              <div className="flex items-center gap-2 mt-3 text-xs font-mono text-muted-foreground bg-muted/50 p-2.5 rounded-md border w-fit">
                "CodeClient_Actif" <ArrowRight className="h-3.5 w-3.5 text-primary" /> ["code", "client", "actif"]
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-4 border rounded-lg bg-card items-start relative overflow-hidden shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted-foreground"></div>
            <div className="bg-muted p-2 rounded-lg text-muted-foreground mt-1">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t("docs.engine_step_2_title")}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t("docs.engine_step_2_desc")}</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 border rounded-lg bg-card items-start relative overflow-hidden shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 mt-1">
              <SearchCode className="h-5 w-5" />
            </div>
            <div className="w-full">
              <h3 className="font-semibold text-foreground">{t("docs.engine_step_3_title")}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-3">{t("docs.engine_step_3_desc")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="border rounded-md p-2.5 flex items-center gap-3 bg-muted/20">
                  <span className="bg-background border shadow-sm px-2 py-0.5 rounded text-xs font-bold text-muted-foreground">{t("docs.priority_1")}</span>
                  <span className="font-medium text-foreground">{t("docs.match_exact")}</span>
                </div>
                <div className="border rounded-md p-2.5 flex items-center gap-3 bg-muted/20">
                  <span className="bg-background border shadow-sm px-2 py-0.5 rounded text-xs font-bold text-muted-foreground">{t("docs.priority_2")}</span>
                  <span className="font-medium text-foreground">{t("docs.match_singular")}</span>
                </div>
                <div className="border rounded-md p-2.5 flex items-center gap-3 bg-muted/20">
                  <span className="bg-background border shadow-sm px-2 py-0.5 rounded text-xs font-bold text-muted-foreground">{t("docs.priority_3")}</span>
                  <span className="font-medium text-foreground">{t("docs.match_synonyms")}</span>
                </div>
                <div className="border rounded-md p-2.5 flex items-center gap-3 bg-muted/20">
                  <span className="bg-background border shadow-sm px-2 py-0.5 rounded text-xs font-bold text-muted-foreground">{t("docs.priority_4")}</span>
                  <span className="font-medium text-foreground">{t("docs.match_abbreviation")}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 p-4 border rounded-lg bg-card items-start relative overflow-hidden shadow-sm">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-success"></div>
            <div className="bg-success/10 p-2 rounded-lg text-success mt-1">
              <Replace className="h-5 w-5" />
            </div>
            <div className="w-full">
              <h3 className="font-semibold text-foreground">{t("docs.engine_step_4_title")}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-3">{t("docs.engine_step_4_desc")}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between p-3 rounded-md bg-success/5 border border-success/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <strong className="text-success">{t("docs.status_ok")}</strong>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">{t("docs.status_ok_desc")}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-warning/5 border border-warning/20">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <strong className="text-warning">{t("docs.status_ambiguous")}</strong>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">{t("docs.status_ambiguous_desc")}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-md bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <strong className="text-destructive">{t("docs.status_unknown")}</strong>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">{t("docs.status_unknown_desc")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section icon={BookOpen} title={t("docs.section_manage_dict")}>
        <p>{t("docs.section_manage_dict_desc")}</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-start gap-2">
            <Plus className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>{t("docs.action_add")}</div>
          </div>
          <div className="flex items-start gap-2">
            <Pencil className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>{t("docs.action_edit")}</div>
          </div>
          <div className="flex items-start gap-2">
            <Trash2 className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>{t("docs.action_delete")}</div>
          </div>
          <div className="flex items-start gap-2">
            <Search className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <div>{t("docs.action_search")}</div>
          </div>
        </div>
      </Section>

      <Section icon={Upload} title={t("docs.section_import_export")}>
        <p>{t("docs.section_import_export_desc")}</p>
        <div className="space-y-2 mt-2">
          <Step n={1}>{t("docs.step_import")}</Step>
          <Step n={2}>{t("docs.step_export")}</Step>
        </div>
        <div className="mt-2 p-3 bg-muted rounded-lg">
          <p className="font-medium text-foreground mb-1">{t("docs.import_warning")}</p>
          <p>{t("docs.import_warning_desc")}</p>
        </div>
      </Section>

      <Section icon={Flag} title={t("docs.section_manage_reports")}>
        <p>{t("docs.section_manage_reports_desc")}</p>
        <div className="space-y-2 mt-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>{t("docs.action_accept")}</div>
          </div>
          <div className="flex items-start gap-2">
            <XCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div>{t("docs.action_reject")}</div>
          </div>
        </div>
      </Section>

      <Section icon={History} title={t("docs.section_history_title")}>
        <p>{t("docs.section_history_desc")}</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>{t("docs.hist_terms")}</li>
          <li>{t("docs.hist_import")}</li>
          <li>{t("docs.hist_reports")}</li>
        </ul>
        <p className="mt-1">{t("docs.hist_footer")}</p>
      </Section>

      <Section icon={Settings} title={t("docs.section_settings")}>
        <p>{t("docs.section_settings_desc")}</p>
      </Section>

      <Section icon={Users} title={t("docs.section_users")}>
        <p>{t("docs.section_users_desc")}</p>
      </Section>
    </div>
  );
}

export default function DocumentationPage() {
  const { role } = useAuth();
  const { t, lang } = useI18nStore();
  const isAdmin = role === "admin";
  const [tab, setTab] = useState("user");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("docs.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("docs.subtitle")}</p>
      </div>

      {isAdmin ? (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="user">{t("docs.tab_user")}</TabsTrigger>
            <TabsTrigger value="admin">{t("docs.tab_admin")}</TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="mt-4">
            <UserGuide />
          </TabsContent>

          <TabsContent value="admin" className="mt-4">
            <AdminGuide />
          </TabsContent>
        </Tabs>
      ) : (
        <UserGuide />
      )}
    </div>
  );
}
