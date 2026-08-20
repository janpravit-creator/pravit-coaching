import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import {
  IconBook,
  IconChart,
  IconCheck,
  IconHome,
  IconList,
  IconMore,
  IconUsers,
} from './icons';

/**
 * Feste Tab-Leiste am unteren Rand – dieselbe Bauart wie in der Logbuch-App.
 *
 * Der Coach hatte bisher sieben gleichrangige Reiter in einer waagerechten
 * Leiste, die auf dem Handy scrollen musste. Daraus werden vier: die drei
 * täglichen Wege plus „Mehr" für alles Übrige.
 */

const KUNDEN_TABS = [
  { to: '/start', label: 'Start', icon: IconHome },
  { to: '/check-in', label: 'Check-in', icon: IconCheck },
  { to: '/logbuch', label: 'Logbuch', icon: IconBook },
  { to: '/fortschritt', label: 'Fortschritt', icon: IconChart },
  { to: '/wiki', label: 'Wiki', icon: IconList },
] as const;

const COACH_TABS = [
  { to: '/coach/kunden', label: 'Kunden', icon: IconUsers },
  { to: '/coach/checkins', label: 'Check-ins', icon: IconCheck },
  { to: '/coach/vorlagen', label: 'Vorlagen', icon: IconList },
  { to: '/coach/mehr', label: 'Mehr', icon: IconMore },
] as const;

export function ClientTabBar() {
  return <TabBar tabs={KUNDEN_TABS} />;
}

export function CoachTabBar() {
  const location = useLocation();
  // In der Kundendetail-Ansicht stört die Leiste – dort zählt der Zurück-Weg.
  if (/^\/coach\/kunden\/[^/]+/.test(location.pathname)) return null;
  return <TabBar tabs={COACH_TABS} />;
}

interface Tab {
  to: string;
  label: string;
  icon: (props: { size?: number }) => React.ReactElement;
}

function TabBar({ tabs }: { tabs: readonly Tab[] }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40">
      <div className="border-t border-line bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-stretch px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5 transition-colors',
                  isActive ? 'text-text' : 'text-subtle',
                )
              }
            >
              <Icon size={23} />
              <span className="text-[10.5px] font-semibold tracking-tight">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}
