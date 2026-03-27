import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, Trash2, X, Info, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

const typeColors: Record<string, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-primary",
};

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Supabase Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as Notification;
          queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
          toast.info(notif.title, { description: notif.message });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
    toast.success("Toutes les notifications marquées comme lues");
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `il y a ${diffMin}min`;
    if (diffHr < 24) return `il y a ${diffHr}h`;
    if (diffDay < 7) return `il y a ${diffDay}j`;
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="h-5 w-5 text-muted-foreground" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-96 bg-card border rounded-xl shadow-lg z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-xs gap-1">
                      <CheckCheck className="h-3 w-3" /> Tout lire
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-7 w-7 p-0">
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Notification List */}
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center">
                    <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const Icon = typeIcons[notif.type] || Info;
                    const colorClass = typeColors[notif.type] || "text-primary";
                    return (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`group flex items-start gap-3 px-4 py-3 border-b last:border-0 hover:bg-muted/30 transition-colors ${
                          !notif.read ? "bg-primary/[0.02]" : ""
                        }`}
                      >
                        <div className={`flex-shrink-0 mt-0.5 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium text-foreground truncate ${!notif.read ? "" : "opacity-70"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDate(notif.created_at)}</p>
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.read && (
                            <button
                              onClick={() => markAsRead(notif.id)}
                              className="p-1 rounded hover:bg-muted"
                              title="Marquer comme lu"
                            >
                              <Check className="h-3 w-3 text-muted-foreground" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notif.id)}
                            className="p-1 rounded hover:bg-destructive/10"
                            title="Supprimer"
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
