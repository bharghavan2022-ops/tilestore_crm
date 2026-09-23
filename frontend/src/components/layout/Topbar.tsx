import { useAuth } from "../../auth/AuthContext";
import { Button } from "../ui/Button";
import { NotificationBell } from "./NotificationBell";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4 pb-6 pt-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <input
          type="search"
          placeholder="Search order / customer"
          className="hidden w-64 rounded-lg border border-border bg-card px-3 py-2 text-sm placeholder:text-muted focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20 md:block"
        />
        <NotificationBell />
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-ink-text">{user?.name}</p>
            <p className="text-xs text-muted">{user?.role.replace("_", " ")}</p>
          </div>
          <Button variant="secondary" onClick={() => void logout()}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
