/**
 * Simple line icons for the menus (24×24, drawn with the current text color).
 * Usage: <Icon name="feed" size={18} />
 */
const PATHS = {
  feed: 'M4 5h16M4 12h16M4 19h10',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.5 3-5.5 7-5.5s7 2 7 5.5M16 3.5a4 4 0 0 1 0 7.5M18 15.6c2.4.6 4 2.4 4 5.4',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z',
  group: 'M4 6h16v12H4zM4 10h16M9 14h6',
  video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
  camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  pen: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  megaphone: 'M3 10v4h4l7 5V5L7 10zM18 9a4 4 0 0 1 0 6',
  survey: 'M7 4h10v17H7zM10 9h4M10 13h4M10 17h2M9 2h6v3H9z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM4 5h4v2a3 3 0 0 1-3 3H4zM20 5h-4v2a3 3 0 0 0 3 3h1zM12 13v4M8 21h8M9 17h6v4H9z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-5-5',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  userplus: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM3 21c0-4 3-6 7-6 1.5 0 2.8.3 4 .8M19 14v6M16 17h6',
  bag: 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  gift: 'M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-2-4-6-4-6-1 0 1 1 1 6 1zM12 7c2-4 6-4 6-1 0 1-1 1-6 1z',
  phone: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17.5v.01',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15l1.6 1-2 3.4-1.8-.7a7 7 0 0 1-2.2 1.3L14.7 22h-4l-.3-2a7 7 0 0 1-2.2-1.3l-1.8.7-2-3.4 1.6-1a7 7 0 0 1 0-2.6l-1.6-1 2-3.4 1.8.7a7 7 0 0 1 2.2-1.3l.3-2h4l.3 2a7 7 0 0 1 2.2 1.3l1.8-.7 2 3.4-1.6 1a7 7 0 0 1 0 2.6z',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l-5-5 5-5M5 12h11',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  ticket: 'M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4zM13 7v10',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  dashboard: 'M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  block: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM6 6l12 12',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
  chevron: 'M6 9l6 6 6-6',
  login: 'M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4M14 17l5-5-5-5M19 12H8',
  menu: 'M4 6h16M4 12h16M4 18h16',
  hash: 'M9 3L7 21M17 3l-2 18M4 8.5h17M3 15.5h17',
  at: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1',
};

export default function Icon({ name, size = 18, className = '' }) {
  const d = PATHS[name] || PATHS.sparkle;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}
