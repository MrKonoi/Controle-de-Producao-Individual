import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, LayoutGrid, BarChart3, Settings } from "lucide-react";
import type { ReactNode } from "react";

const nav = [
  { to: "/", label: "Produzir", icon: LayoutGrid },
  { to: "/calendario", label: "Calendário", icon: CalendarDays },
  { to: "/mensal", label: "Mensal", icon: BarChart3 },
  { to: "/admin", label: "Ajustes", icon: Settings },
];

export function AppShell({
  title,
  subtitle,
  left,
  children,
}: {
  title: string;
  subtitle?: string;
  left?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 bg-primary text-primary-foreground shadow-sm">
        <div className="mx-auto grid max-w-2xl grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-4 py-4">
          {left}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="truncate text-sm opacity-85">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card">
        <div className="mx-auto flex max-w-2xl">
          {nav.map(({ to, label, icon: Icon }) => {
            const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`flex flex-1 flex-col items-center gap-1 py-3 text-xs font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
