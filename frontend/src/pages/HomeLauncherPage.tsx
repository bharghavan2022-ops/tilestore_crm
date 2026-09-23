import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NotificationBell } from "../components/layout/NotificationBell";
import { APP_TILES } from "../components/launcher/appTiles";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomeLauncherPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const tiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return APP_TILES;
    return APP_TILES.filter((tile) => tile.label.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="-mx-8">
      {/* Minimal top bar, distinct from the in-app Topbar used on every other
          page - matches the launcher's own header in the Odoo reference
          (search on the left, notifications + avatar on the right). */}
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-3.5">
        <div className="flex-1">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search apps…"
            className="w-full max-w-xs rounded-lg border border-border bg-cream px-3 py-2 text-sm placeholder:text-muted focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20"
          />
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-brass-light">
            {user?.name?.slice(0, 1).toUpperCase() ?? "?"}
          </div>
        </div>
      </header>

      <div className="px-8 py-12">
        <h1 className="text-xl font-medium text-ink-text">
          {greeting()}, {user?.name?.split(" ")[0] ?? "there"}
        </h1>

        <div className="mt-10 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            return (
              <Link
                key={tile.path}
                to={tile.path}
                className={`group flex flex-col items-center gap-2.5 rounded-xl px-2 py-3 text-center transition-colors hover:bg-black/[0.03] ${
                  tile.available ? "" : "opacity-50"
                }`}
              >
                <span
                  className={`flex h-16 w-16 items-center justify-center rounded-[18px] text-white shadow-[0_6px_14px_-4px_rgba(0,0,0,0.35)] transition-transform duration-150 group-hover:scale-[1.06] ${tile.badgeClassName}`}
                >
                  <Icon size={30} strokeWidth={2} />
                </span>
                <span className="text-[13px] font-medium leading-tight text-ink-text">{tile.label}</span>
                {!tile.available && (
                  <span className="-mt-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted">Coming soon</span>
                )}
              </Link>
            );
          })}
          {tiles.length === 0 && <p className="col-span-full text-center text-sm text-muted">No apps match "{search}"</p>}
        </div>
      </div>
    </div>
  );
}
