/**
 * Purpose: The small stroke icons the dropdown menus use.
 * Inputs: A name from `MENU_ICONS`.
 * Returns: A 14px inline SVG that inherits `currentColor`.
 * Does not: carry meaning on its own — every item still has a text label.
 */

/** Every glyph a menu row can show. */
export type MenuIconName =
  | "profile"
  | "plus"
  | "edit"
  | "sliders"
  | "doc"
  | "mic"
  | "badge"
  | "folder"
  | "import"
  | "ledger"
  | "history"
  | "building"
  | "copy"
  | "duplicate"
  | "archive";

const PATHS: Record<MenuIconName, string> = {
  profile: "M8 8.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5ZM2.5 13.5c0-2.2 2.5-3.5 5.5-3.5s5.5 1.3 5.5 3.5",
  plus: "M8 3.5v9M3.5 8h9",
  edit: "M11 2.8 13.2 5 5.7 12.5l-2.9.7.7-2.9 7.5-7.5Z",
  sliders: "M2.5 5h7M12 5h1.5M2.5 11h2M7 11h6.5M10.5 3.2v3.6M5 9.2v3.6",
  doc: "M4 2h5l3 3v9H4V2ZM9 2v3h3",
  mic: "M8 2.5a1.6 1.6 0 0 1 1.6 1.6v3.4a1.6 1.6 0 0 1-3.2 0V4.1A1.6 1.6 0 0 1 8 2.5ZM4.5 7.4a3.5 3.5 0 0 0 7 0M8 11v2.5",
  badge: "M8 2.5 9.6 5.6l3.4.5-2.5 2.4.6 3.4L8 10.3l-3.1 1.6.6-3.4L3 6.1l3.4-.5L8 2.5Z",
  folder: "M2.5 4.5h4l1.2 1.5h5.8v6.5h-11V4.5Z",
  import: "M8 2.5v7m0 0L5.5 7M8 9.5 10.5 7M3 12.5h10",
  ledger: "M3.5 2.5h9v11h-9v-11ZM6 5.5h4M6 8h4M6 10.5h2.5",
  history: "M3 8a5 5 0 1 0 1.5-3.6M3 3v2.2h2.2M8 5.5V8l1.8 1.1",
  building: "M3.5 13.5v-10h6v10M9.5 6.5h3v7M5.5 5.8h2M5.5 8.3h2M5.5 10.8h2",
  copy: "M5.5 5.5h7v7h-7v-7ZM3.5 10.5v-7h7",
  duplicate: "M6 2.5h7.5V10M2.5 6h7.5v7.5H2.5V6Z",
  archive: "M2.5 4.5h11v2.5h-11V4.5ZM3.5 7v6.5h9V7M6.5 9.5h3",
};

interface MenuIconProps {
  name: MenuIconName;
  className?: string;
}

export function MenuIcon({ name, className }: MenuIconProps) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
