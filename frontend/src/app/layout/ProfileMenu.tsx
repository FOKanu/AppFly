import { createPortal } from "react-dom";
import { Menu, type MenuSectionSpec } from "../../shared/ui/Menu";
import { useMenu } from "../../shared/ui/useMenu";
import { ROUTES } from "../../routes";
import type { HuntProfile } from "../../features/profiles/types";
import { NOT_PERSISTED_NOTE } from "../../features/profiles/api";

interface ProfileMenuProps {
  /** Every preset the API knows about. One, today. */
  profiles: HuntProfile[];
  activeId: string | null;
  onActivate: (id: string) => void;
  /** Copy a vault path to the clipboard — the app cannot open Finder itself. */
  onCopyVaultPath: () => void;
}

/** The menu is portalled, so its width is fixed here rather than by the rail. */
const MENU_WIDTH = 284;

/** Why the single-preset items are inert. */
const SINGLE_PRESET_NOTE =
  "config.yaml holds one search preset. Storing several needs a /profiles endpoint.";

/**
 * Purpose: The sidebar PROFILE control — a real menu over the active hunt
 *          profile, its documents and the memory ledgers.
 * Does not: navigate on open (it used to), or offer writes the API cannot do.
 *           The popover is portalled to <body> so the sidebar's overflow
 *           cannot clip it.
 */
export function ProfileMenu({
  profiles,
  activeId,
  onActivate,
  onCopyVaultPath,
}: ProfileMenuProps) {
  const menu = useMenu({ width: MENU_WIDTH, align: "overlay" });
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0] ?? null;
  const activeName = active?.name ?? "No profile";
  const others = profiles.filter((profile) => profile.id !== active?.id);
  const profileHref = active ? `${ROUTES.profiles}/${active.id}` : ROUTES.profiles;

  const sections: MenuSectionSpec[] = [
    {
      id: "context",
      label: "Profiles",
      items: [
        // The active profile is the header card above, so it is not repeated
        // here — this list is only the presets you could switch to.
        ...others.map((profile) => ({
          id: `switch-${profile.id}`,
          label: profile.name,
          icon: "profile" as const,
          detail: "switch",
          onSelect: () => onActivate(profile.id),
        })),
        ...(others.length === 0
          ? [
              {
                id: "only-preset",
                label: active ? "No other preset to switch to" : "No preset configured",
                icon: "profile" as const,
                disabled: true,
                reason: active
                  ? SINGLE_PRESET_NOTE
                  : "Set role titles and a location in Profiles to create one.",
              },
            ]
          : []),
        {
          id: "new-preset",
          label: "New hunt profile…",
          icon: "plus" as const,
          disabled: true,
          reason: SINGLE_PRESET_NOTE,
        },
      ],
    },
    {
      id: "identity",
      label: "Identity",
      items: [
        { id: "view-profile", label: "View profile", icon: "profile", to: profileHref },
        {
          id: "edit-preset",
          label: "Edit search preset",
          icon: "edit",
          to: `${profileHref}#edit`,
        },
        {
          id: "edit-requirements",
          label: "Requirements & skip list",
          icon: "sliders",
          to: `${profileHref}#requirements`,
        },
      ],
    },
    {
      id: "documents",
      label: "Documents & credentials",
      items: [
        { id: "manage-cvs", label: "Manage CVs", icon: "doc", to: `${profileHref}#documents` },
        {
          id: "voice-samples",
          label: "Voice samples",
          icon: "mic",
          to: `${profileHref}#documents`,
        },
        {
          id: "add-certification",
          label: "Add certification / license",
          icon: "badge",
          disabled: true,
          reason: NOT_PERSISTED_NOTE,
        },
        {
          id: "add-portfolio",
          label: "Add portfolio / case study",
          icon: "folder",
          disabled: true,
          reason: NOT_PERSISTED_NOTE,
        },
        {
          id: "import-vault",
          label: "Import from vault",
          icon: "import",
          disabled: true,
          reason:
            "The copilot reads the vault directly; there is no import step. Point Settings at the right folder instead.",
        },
      ],
    },
    {
      id: "memory",
      label: "Memory",
      items: [
        {
          id: "applications",
          label: "Application ledger",
          icon: "ledger",
          to: `${ROUTES.memory}#applications`,
        },
        {
          id: "versions",
          label: "Profile version history",
          icon: "history",
          to: `${ROUTES.memory}#versions`,
        },
        {
          id: "companies",
          label: "Companies I've already hit",
          icon: "building",
          to: `${ROUTES.memory}#companies`,
        },
      ],
    },
    {
      id: "hygiene",
      label: "Hygiene",
      items: [
        {
          id: "copy-vault",
          label: "Copy vault path",
          icon: "copy",
          onSelect: onCopyVaultPath,
        },
        {
          id: "duplicate",
          label: "Duplicate profile",
          icon: "duplicate",
          disabled: true,
          reason: SINGLE_PRESET_NOTE,
        },
        {
          id: "archive",
          label: "Archive profile",
          icon: "archive",
          disabled: true,
          reason: SINGLE_PRESET_NOTE,
          tone: "danger" as const,
        },
      ],
    },
  ];

  return (
    <div className="profile-menu">
      <button
        type="button"
        id="profile-menu-trigger"
        ref={menu.triggerRef}
        className={menu.open ? "sidebar__profile is-open" : "sidebar__profile"}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-controls={menu.open ? "profile-menu" : undefined}
        onClick={menu.toggle}
        onKeyDown={menu.triggerKeyDown}
      >
        <span className="sidebar__profile-col">
          <span className="sidebar__profile-label">Profile</span>
          <span className="sidebar__profile-value">{activeName}</span>
        </span>
        <span className="sidebar__profile-caret" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </span>
      </button>

      {menu.open
        ? createPortal(
            <div
              id="profile-menu"
              ref={menu.menuRef}
              className="profile-menu__popover"
              data-flipped={menu.position.flipped}
              style={{
                left: menu.position.left,
                top: menu.position.flipped ? undefined : menu.position.top,
                bottom: menu.position.flipped
                  ? window.innerHeight - menu.position.top
                  : undefined,
                width: MENU_WIDTH,
                maxHeight: menu.position.maxHeight,
              }}
              onKeyDown={menu.menuKeyDown}
            >
              <Menu
                sections={sections}
                registerItem={menu.registerItem}
                activeIndex={menu.activeIndex}
                onChoose={menu.close}
                labelledBy="profile-menu-trigger"
                onHeaderClick={menu.close}
                headerLabel={`${activeName} — close profile menu`}
                header={
                  <>
                    <span className="menu__header-avatar" aria-hidden="true">
                      {initialsOf(activeName)}
                    </span>
                    <span className="menu__header-col">
                      <span className="menu__header-name">{activeName}</span>
                      <span className="menu__header-meta">
                        {active
                          ? `${active.roleTitles.length} role title${active.roleTitles.length === 1 ? "" : "s"} · ${active.location || "any location"}`
                          : "no preset configured"}
                      </span>
                    </span>
                    <span className="menu__header-badge">active</span>
                    <span className="menu__header-caret" aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m4 10 4-4 4 4" />
                      </svg>
                    </span>
                  </>
                }
                footer={
                  <>
                    <kbd>↑</kbd>
                    <kbd>↓</kbd>
                    <span>move</span>
                    <kbd>↵</kbd>
                    <span>select</span>
                    <kbd>esc</kbd>
                    <span>close</span>
                  </>
                }
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Up to two initials for the header chip, e.g. "Senior PM — Berlin" → "SP". */
function initialsOf(name: string): string {
  const words = name.replace(/[—–-]/g, " ").split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]?.toUpperCase() ?? "").join("") || "?";
}
