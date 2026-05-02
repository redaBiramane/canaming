import { 
  LayoutDashboard, TextCursorInput, Code2, BookOpen, Database, Sparkles,
  History, Settings, ChevronLeft, Home, BarChart3, LogOut, Flag, FileText, Shield, Users, ChevronUp, ClipboardPaste, Ban, Search, FileCode2
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logoCA from "@/assets/logo-ca.png";
import { useAppStore } from "@/hooks/useStore";
import { useI18nStore } from "@/lib/i18n";

export function AppSidebar() {
  const { state: sidebarState, toggleSidebar } = useSidebar();
  const collapsed = sidebarState === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const { signalements } = useAppStore();
  const { t, lang } = useI18nStore();
  const isAdmin = role === "admin";
  const pendingCount = signalements.filter((s) => s.statut === "en_attente").length;

  const mainItems = [
    { title: t("sidebar.home"), url: "/", icon: Home },
    { title: t("sidebar.dashboard"), url: "/dashboard", icon: BarChart3 },
    { title: t("sidebar.search"), url: "/glossary", icon: Search },
    { title: t("sidebar.rename"), url: "/rename", icon: TextCursorInput },
    { title: t("sidebar.excel"), url: "/excel-paste", icon: ClipboardPaste },
    { title: t("sidebar.sql"), url: "/sql", icon: Code2 },
    { title: t("sidebar.dbt"), url: "/dbt", icon: Database },
    { title: t("sidebar.sas"), url: "/sas", icon: FileCode2 },
    { title: t("sidebar.ianaming"), url: "/ia-naming", icon: Sparkles },
  ];

  const adminItems = [
    { title: t("sidebar.dictionary"), url: "/admin", icon: BookOpen },
    { title: t("sidebar.stopwords"), url: "/stop-words", icon: Ban },
    { title: t("sidebar.reports"), url: "/signalements", icon: Flag },
    { title: t("sidebar.history"), url: "/history", icon: History },
    { title: t("sidebar.docs"), url: "/documentation", icon: FileText },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <img src={logoCA} alt="CA Personal Finance & Mobility" className="h-16 w-auto flex-shrink-0" />
          </div>
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-7 w-7 flex-shrink-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        {!collapsed && (
          <p className="text-sm font-normal text-foreground tracking-wide text-center mt-1">Naming Studio</p>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t("sidebar.admin")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && (
                        <span className="flex items-center justify-between flex-1">
                          {item.title}
                          {item.url === "/signalements" && pendingCount > 0 && (
                            <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                              {pendingCount}
                            </span>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-medium text-primary">
                      {role === "admin" ? "A" : "U"}
                    </span>
                  </div>
                  <div className="text-xs text-left">
                    <p className="font-medium text-sidebar-foreground truncate max-w-[120px]">
                      {user?.email?.split("@")[0]}
                    </p>
                    <p className="text-muted-foreground">
                      {role === "admin" ? t("sidebar.role_admin") : t("sidebar.role_user")}
                    </p>
                  </div>
                </div>
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem onClick={() => navigate("/settings")} className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" /> {t("sidebar.settings")}
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/users")} className="gap-2 cursor-pointer">
                  <Users className="h-4 w-4" /> {t("sidebar.users")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive">
                <LogOut className="h-4 w-4" /> {t("sidebar.logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
