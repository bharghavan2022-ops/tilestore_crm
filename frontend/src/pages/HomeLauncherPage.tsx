import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { NotificationBell } from "../components/layout/NotificationBell";
import { APP_TILES, TILE_COLOR_CLASSES } from "../components/launcher/appTiles";

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
          (greeting + search on the left, notifications + avatar on the right). */}
      <header className="flex items-center justify-between border-b border-border bg-card px-8 py-4">
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
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-xs font-semibold text-brass-light">
            {user?.name?.slice(0, 1).toUpperCase() ?? "?"}
          </div>
        </div>
      </header>

      <div className="px-8 py-10">
        <h1 className="text-2xl font-semibold text-ink-text">
          {greeting()}, {user?.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="mt-1 text-sm text-muted">Pick an app to get started.</p>

        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const content = (
              <div
                className={`flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card px-4 py-6 text-center shadow-sm transition-all ${
                  tile.available ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-60"
                }`}
              >
                <span className={`flex h-14 w-14 items-center justify-center rounded-xl ${TILE_COLOR_CLASSES[tile.color]}`}>
                  <Icon size={26} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium text-ink-text">{tile.label}</span>
                {!tile.available && <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">Coming soon</span>}
              </div>
            );

            return (
              <Link key={tile.path} to={tile.path} className="block">
                {content}
              </Link>
            );
          })}
          {tiles.length === 0 && <p className="col-span-full text-center text-sm text-muted">No apps match "{search}"</p>}
        </div>
      </div>
    </div>
  );
}
