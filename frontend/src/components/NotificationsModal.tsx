import { useEffect, useState } from "react";
import { Bell, CheckCheck, Clock, Shield, UserPlus, Users, X } from "lucide-react";
import { api } from "../lib/api";

export type NotificationItem = {
  id: number;
  title: string;
  body: string;
  read_at: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationsModal({
  isOpen,
  onClose,
  onNavigate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (tab: string) => void;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await api<NotificationItem[]>("notifications/");
      setNotifications(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const markRead = async (id: number) => {
    try {
      await api(`notifications/${id}/read/`, { method: "POST" });
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
      );
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await api("notifications/read-all/", { method: "POST" });
      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    } catch {}
  };

  if (!isOpen) return null;

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("friend")) return <UserPlus size={18} className="text-[#c6f36b]" />;
    if (t.includes("squad")) return <Users size={18} className="text-[#c6f36b]" />;
    if (t.includes("tournament") || t.includes("slot")) return <Shield size={18} className="text-[#c6f36b]" />;
    return <Bell size={18} className="text-[#c6f36b]" />;
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${Math.floor(diffHours / 24)}d ago`;
    } catch {
      return "";
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="neo w-full max-w-lg bg-[#F4EFE6] dark:bg-[#0D0E12] p-5 sm:p-6 shadow-[8px_8px_0px_#000000] dark:shadow-[8px_8px_0px_#c6f36b] max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-black dark:border-white/20 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="border-2 border-black bg-[#C6F36B] p-1.5 shadow-[2px_2px_0px_#000000]">
              <Bell size={20} className="text-black" strokeWidth={2.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black uppercase tracking-tight text-black dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="border-2 border-black bg-[#FF4757] px-2 py-0.5 text-[10px] font-black text-white shadow-[2px_2px_0px_#000000]">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-black/60 dark:text-white/60">
                Squad invites, friend alerts & updates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="border-2 border-black bg-white dark:bg-[#1a1c23] p-1 text-black dark:text-white hover:bg-black hover:text-white transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {/* Action bar */}
        {notifications.length > 0 && (
          <div className="flex justify-between items-center mb-3 text-xs">
            <span className="font-bold text-black/60 dark:text-white/60 uppercase text-[11px]">
              {notifications.length} Total Notification{notifications.length === 1 ? "" : "s"}
            </span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 font-black text-xs uppercase tracking-wider text-black dark:text-[#C6F36B] hover:underline"
              >
                <CheckCheck size={14} strokeWidth={2.5} /> Mark all as read
              </button>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {loading && notifications.length === 0 ? (
            <div className="p-8 text-center text-xs font-black uppercase text-black/60 dark:text-white/60">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="neo p-8 text-center">
              <Bell size={32} strokeWidth={2} className="mx-auto text-black/30 dark:text-white/30 mb-2" />
              <p className="text-sm font-black uppercase text-black dark:text-white">No notifications yet</p>
              <p className="text-xs font-bold text-black/60 dark:text-white/60 mt-1">
                Friend requests and squad invites will appear right here.
              </p>
            </div>
          ) : (
            notifications.map(item => {
              const isFriend = item.title.toLowerCase().includes("friend");
              const isSquad = item.title.toLowerCase().includes("squad");

              return (
                <div
                  key={item.id}
                  onClick={() => !item.is_read && markRead(item.id)}
                  className={`border-2 p-3.5 transition-all text-left ${
                    !item.is_read
                      ? "border-black bg-[#C6F36B]/20 dark:bg-[#C6F36B]/10 shadow-[3px_3px_0px_#000000] dark:shadow-[3px_3px_0px_#C6F36B]"
                      : "border-black/30 dark:border-white/20 bg-white dark:bg-[#1a1c23] opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="border border-black bg-black p-1 text-white">
                        {getIcon(item.title)}
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-tight text-black dark:text-white">
                        {item.title}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/50 dark:text-white/50 shrink-0">
                      <Clock size={11} />
                      <span>{formatTime(item.created_at)}</span>
                    </div>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-black/80 dark:text-white/80 leading-relaxed">
                    {item.body}
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 dark:border-white/10 pt-2">
                    {isFriend && onNavigate && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          markRead(item.id);
                          onClose();
                          onNavigate("friends");
                        }}
                        className="neo-solid min-h-7 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black"
                      >
                        Go to Friends →
                      </button>
                    )}
                    {isSquad && onNavigate && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          markRead(item.id);
                          onClose();
                          onNavigate("squad");
                        }}
                        className="neo-solid min-h-7 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black"
                      >
                        Go to Squad →
                      </button>
                    )}
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          markRead(item.id);
                        }}
                        className="ml-auto text-[10px] font-black uppercase text-black/60 dark:text-white/60 hover:underline"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
