import { Link, NavLink } from "react-router-dom";
import { PRIMARY_NAV, ADMIN_NAV } from "./navConfig";
import { useHealthStatus } from "../../api/health";

function NavList({ items }: { items: typeof PRIMARY_NAV }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.path}>
          <NavLink
            to={item.path}
            end={item.path === "/"}
            className={({ isActive }) =>
              `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-brass/15 text-brass-light"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

export function Sidebar() {
  const isHealthy = useHealthStatus();

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col bg-ink px-4 py-5">
      <Link to="/" className="block px-2">
        <p className="text-lg font-bold tracking-tight text-white">
          TILE / <span className="text-brass">OS</span>
        </p>
        <p className="mt-0.5 text-[10px] font-semibold tracking-[0.2em] text-white/40">CONTROL CENTER</p>
      </Link>

      <nav className="mt-8 flex-1 overflow-y-auto">
        <NavList items={PRIMARY_NAV} />

        <p className="mb-2 mt-6 px-3 text-[10px] font-semibold tracking-[0.2em] text-white/30">ADMIN</p>
        <NavList items={ADMIN_NAV} />
      </nav>

      <div className="space-y-1.5 border-t border-white/10 pt-4">
        <StatusDot label="API connection" ok={isHealthy} />
      </div>
    </aside>
  );
}

function StatusDot({ label, ok }: { label: string; ok: boolean | null }) {
  const color = ok === null ? "bg-white/30" : ok ? "bg-status-success" : "bg-status-critical";
  return (
    <div className="flex items-center gap-2 px-2 text-xs text-white/50">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </div>
  );
}
