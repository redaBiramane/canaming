import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UserWithRole {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: "admin" | "user";
}

export default function UsersPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [usersWithRoles, setUsersWithRoles] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("user_id, email, display_name");
    const { data: roles } = await supabase.from("user_roles").select("user_id, role");
    if (profiles && roles) {
      const roleMap = new Map(roles.map(r => [r.user_id, r.role as "admin" | "user"]));
      setUsersWithRoles(profiles.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) || "user",
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const toggleRole = async (userId: string, currentRole: "admin" | "user") => {
    const newRole = currentRole === "admin" ? "user" : "admin";
    if (userId === user?.id && newRole === "user") {
      if (!confirm("Vous allez perdre vos droits admin. Continuer ?")) return;
    }
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);
    if (error) {
      toast.error("Erreur : " + error.message);
    } else {
      toast.success(`Rôle changé en ${newRole}`);
      fetchUsers();
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" /> Gestion des utilisateurs
          </h1>
          <p className="text-muted-foreground mt-1">{usersWithRoles.length} utilisateurs inscrits</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          Rafraîchir
        </Button>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ca-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium text-muted-foreground">Utilisateur</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Rôle</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
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
                    <Badge variant={u.role === "admin" ? "default" : "secondary"} className="gap-1">
                      {u.role === "admin" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      {u.role === "admin" ? "Admin" : "Utilisateur"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleRole(u.user_id, u.role)}
                      className="gap-1"
                    >
                      {u.role === "admin" ? (
                        <><User className="h-3.5 w-3.5" /> Rétrograder</>
                      ) : (
                        <><Shield className="h-3.5 w-3.5" /> Promouvoir admin</>
                      )}
                    </Button>
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
