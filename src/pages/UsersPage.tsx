import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, User, Users, Ban, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useI18nStore } from "@/lib/i18n";

interface UserWithRole {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: "admin" | "user";
  is_blocked?: boolean;
}

export default function UsersPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const { t, lang } = useI18nStore();
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("user_id, email, display_name");
      const { data: roles } = await supabase.from("user_roles").select("user_id, role, is_blocked");
      
      if (profiles && roles) {
        const roleMap = new Map(roles.map(r => [r.user_id, { role: r.role as "admin" | "user", is_blocked: r.is_blocked }]));
        setUsersWithRoles(profiles.map(p => {
          const userRole = roleMap.get(p.user_id);
          return {
            ...p,
            role: userRole?.role || "user",
            is_blocked: userRole?.is_blocked || false,
          };
        }));
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const toggleBlock = async (userId: string, currentStatus: boolean) => {
    if (userId === user?.id) {
      toast.error(t("admin.cannot_block_self") || "Vous ne pouvez pas vous bloquer vous-même");
      return;
    }
    
    const { error } = await supabase
      .from("user_roles")
      .update({ is_blocked: !currentStatus })
      .eq("user_id", userId);

    if (error) {
      toast.error(t("admin.toast_error") + " : " + error.message);
    } else {
      toast.success(!currentStatus ? "Utilisateur bloqué" : "Utilisateur débloqué");
      fetchUsers();
    }
  };

  const deleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error(t("admin.cannot_delete_self") || "Vous ne pouvez pas vous supprimer vous-même");
      return;
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action supprimera son profil.")) return;

    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);

    if (error) {
      toast.error(t("admin.toast_error") + " : " + error.message);
    } else {
      toast.success("Utilisateur supprimé de la base");
      fetchUsers();
    }
  };

  const toggleRole = async (userId: string, currentRole: "admin" | "user") => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (userId === user?.id && newRole === "user") {
      if (!confirm(t("admin.revoke_admin_confirm"))) return;
    }
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);
    if (error) {
      toast.error(t("admin.toast_error") + " : " + error.message);
    } else {
      toast.success(t("admin.role_changed").replace("{role}", newRole));
      fetchUsers();
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">{t("admin.admin_only")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> {t("admin.users_title")}
          </h1>
          <p className="text-muted-foreground mt-1">{usersWithRoles.length} {t("admin.users_desc")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          {t("admin.refresh")}
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("dashboard.user_col") || "Utilisateur"}</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_role")}</th>
                <th className="text-left p-3 font-medium text-muted-foreground">{t("admin.col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {usersWithRoles.map((u) => (
                <tr key={u.user_id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="p-3 font-medium text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">
                        {(u.display_name || u.email || "?")[0].toUpperCase()}
                      </span>
                    </div>
                    {u.display_name || "—"}
                  </td>
                  <td className="p-3 text-muted-foreground">{u.email}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-1">
                      <Badge variant={u.role === "admin" ? "default" : "secondary"} className="gap-1 w-fit">
                        {u.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {u.role === "admin" ? "Admin" : t("dashboard.subtitle_user").split(' ')[0] || "User"}
                      </Badge>
                      {u.is_blocked && (
                        <Badge variant="destructive" className="gap-1 w-fit">
                          <Ban className="h-3 w-3" /> Bloqué
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleRole(u.user_id, u.role)}
                        className="gap-1.5 min-w-[120px]"
                      >
                        {u.role === "admin" ? (
                          <><User className="h-3.5 w-3.5" /> {t("admin.demote")}</>
                        ) : (
                          <><Shield className="h-3.5 w-3.5" /> {t("admin.promote")}</>
                        )}
                      </Button>

                      <Button
                        variant={u.is_blocked ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBlock(u.user_id, u.is_blocked || false)}
                        className={u.is_blocked ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-orange-500 hover:text-orange-600"}
                        title={u.is_blocked ? "Débloquer" : "Bloquer"}
                      >
                        {u.is_blocked ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteUser(u.user_id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
