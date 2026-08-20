import type { SVGProps } from 'react';

/**
 * Icon-Set.
 *
 * Durchgehend 24×24, Linienstil mit runden Enden – das passt zur weichen,
 * gerundeten Formensprache der Vorlagen. Bewusst selbst gezeichnet statt einer
 * Icon-Bibliothek: die App soll offline und ohne Fremdpakete auskommen.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconMinus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12.5 9.5 18 20 6.5" />
  </Icon>
);

export const IconX = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 9l7 7 7-7" />
  </Icon>
);

export const IconChevronUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 15l7-7 7 7" />
  </Icon>
);

export const IconArrowUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Icon>
);

export const IconArrowDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const IconSearch = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Icon>
);

export const IconFilter = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </Icon>
);

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4.5v15l12-7.5z" fill="currentColor" />
  </Icon>
);

export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 5v14M15 5v14" />
  </Icon>
);

export const IconTimer = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9 2h6" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M10 7V4h4v3M6 7l1 13h10l1-13M10 11v5M14 11v5" />
  </Icon>
);

export const IconEdit = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3z" />
  </Icon>
);

export const IconCopy = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 6.5A2.5 2.5 0 0 0 12.5 4H6.5A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15" />
  </Icon>
);

export const IconGrip = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.5}>
    <path d="M8 7h.01M8 12h.01M8 17h.01M16 7h.01M16 12h.01M16 17h.01" />
  </Icon>
);

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 11l8-7 8 7v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const IconChart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 19V11M12 19V5M19 19v-6" />
  </Icon>
);

export const IconDumbbell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 10v4M6.5 7.5v9M17.5 7.5v9M21 10v4M6.5 12h11" />
  </Icon>
);

export const IconList = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
);

/**
 * Regler statt Zahnrad. Ein Zahnrad aus Kreis und Speichen sieht bei 20 px
 * wie eine Sonne aus – die Schieberegler sind auf einen Blick eindeutig.
 */
export const IconSettings = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
    <circle cx="15" cy="7" r="2.2" />
    <circle cx="9" cy="12" r="2.2" />
    <circle cx="15" cy="17" r="2.2" />
  </Icon>
);

export const IconFlame = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3c3 4 5.5 5.5 5.5 9a5.5 5.5 0 0 1-11 0c0-1.8.8-3 1.8-4 .2 1 .8 1.8 1.7 1.8 1.5 0 2-2.5 2-6.8z" />
  </Icon>
);

export const IconTrophy = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
    <path d="M7 5.5H4.5V8a3 3 0 0 0 3 3M17 5.5h2.5V8a3 3 0 0 1-3 3M9.5 20h5M12 14v6" />
  </Icon>
);

export const IconNote = (p: IconProps) => (
  <Icon {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="3" />
    <path d="M8.5 8.5h7M8.5 12.5h7M8.5 16.5h4" />
  </Icon>
);

export const IconSkip = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 5l9 7-9 7zM18 5v14" />
  </Icon>
);

export const IconSwap = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5" />
  </Icon>
);

export const IconMore = (p: IconProps) => (
  <Icon {...p} strokeWidth={2.5}>
    <path d="M5 12h.01M12 12h.01M19 12h.01" />
  </Icon>
);

export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z" />
  </Icon>
);

export const IconStarFilled = (p: IconProps) => (
  <Icon {...p}>
    <path
      d="M12 3.5l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-2.9-5.3 2.9 1.1-6L3.4 9.9l6-.8z"
      fill="currentColor"
    />
  </Icon>
);

export const IconBody = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M12 7v7M7 9.5h10M9.5 21l2.5-7 2.5 7" />
  </Icon>
);

export const IconRun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="15" cy="4.5" r="1.8" />
    <path d="M9 21l2.5-5.5L9 12l1-4 3.5-1.5 2 3.5 3 1M7 8.5l3-1M10.5 15.5L7 17" />
  </Icon>
);

export const IconClock = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7v5.2l3.2 2" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 7.8h.01" />
  </Icon>
);

export const IconDownload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19.5h15" />
  </Icon>
);

export const IconUpload = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 16V5M7.5 9.5L12 5l4.5 4.5M4.5 19.5h15" />
  </Icon>
);

export const IconUndo = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 9h10a5.5 5.5 0 0 1 0 11h-4M4 9l4-4M4 9l4 4" />
  </Icon>
);

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M21.5 12h-2M4.5 12h-2M18.4 5.6l-1.4 1.4M7 17l-1.4 1.4M18.4 18.4L17 17M7 7L5.6 5.6" />
  </Icon>
);

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Icon>
);

/* ------------------------------------------------------------------ *
 * Ergänzungen für den Coaching-Bereich
 * ------------------------------------------------------------------ */

export const IconUsers = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0M17 5.2a3.5 3.5 0 0 1 0 6.6M18.5 20a6.4 6.4 0 0 0-3-5.4" />
  </Icon>
);

export const IconMoney = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="2.5" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M6 12h.01M18 12h.01" />
  </Icon>
);

export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v18H5.5A1.5 1.5 0 0 1 4 19.5z" />
    <path d="M4 17.5A1.5 1.5 0 0 1 5.5 16H19" />
  </Icon>
);

export const IconSalad = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12h17a8.5 8.5 0 0 1-17 0z" />
    <path d="M6 21h12M8 8.5c0-2 1.6-3.5 3.5-3.5M13 9c1-1.6 2.6-2.4 4-2.2" />
  </Icon>
);

export const IconPill = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2" y="8.5" width="20" height="7" rx="3.5" transform="rotate(-45 12 12)" />
    <path d="M9 9l6 6" />
  </Icon>
);

export const IconTarget = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="0.6" fill="currentColor" />
  </Icon>
);

export const IconBell = (p: IconProps) => (
  <Icon {...p}>
    <path d="M18 15V10a6 6 0 1 0-12 0v5l-1.5 2.5h15z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </Icon>
);

export const IconLogout = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 4.5h3A1.5 1.5 0 0 1 19.5 6v12a1.5 1.5 0 0 1-1.5 1.5h-3" />
    <path d="M11 8l-4 4 4 4M7 12h9" />
  </Icon>
);
