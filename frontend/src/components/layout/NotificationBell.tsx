import { useState } from "react";
import { Bell } from "lucide-react";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useMyNotifications } from "../../api/notifications";
import { formatDateTime } from "../../lib/format";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const notifications = useMyNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications.data?.unreadCount ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-cream hover:text-ink-text"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-status-critical px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="text-sm font-semibold text-ink-text">Notifications</span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="text-xs font-medium text-brass-dark hover:underline"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {notifications.data?.data.length ? (
                notifications.data.data.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => !n.readAt && markRead.mutate(n.id)}
                    className={`block w-full border-b border-border px-4 py-3 text-left last:border-0 hover:bg-cream/60 ${
                      n.readAt ? "" : "bg-brass/5"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-ink-text">{n.title}</p>
                      {!n.readAt && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" />}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{n.message}</p>
                    <p className="mt-1 font-figures text-[10px] text-muted">{formatDateTime(n.createdAt)}</p>
                  </button>
                ))
              ) : (
                <p className="px-4 py-8 text-center text-sm text-muted">No notifications yet</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
