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

/**
 * Purpose: The sidebar PROFILE control — a real menu over the active hunt
 *          profile, its documents and the memory ledgers.
 * Does not: navigate on open (it used to), or offer writes the API cannot do.
 */
export function ProfileMenu({
  profiles,
  activeId,
  onActivate,
  onCopyVaultPath,
}: ProfileMenuProps) {
  const menu = useMenu();
  const active = profiles.find((profile) => profile.id === activeId) ?? profiles[0] ?? null;
  const activeName = active?.name ?? "No profile";
  const profileHref = active ? `${ROUTES.profiles}/${active.id}` : ROUTES.profiles;

  const sections: MenuSectionSpec[] = [
    {
      id: "context",
      label: "Active context",
      items: [
        ...profiles.map((profile) => ({
          id: `switch-${profile.id}`,
          label: profile.name,
          detail: profile.id === active?.id ? "active" : undefined,
          checked: profile.id === active?.id,
          onSelect: () => onActivate(profile.id),
        })),
        ...(profiles.length === 0
          ? [
              {
                id: "no-profiles",
                label: "No preset configured",
                disabled: true,
                reason: "Set role titles and a location in Profiles to create one.",
              },
            ]
          : []),
        {
          id: "new-preset",
          label: "New hunt profile…",
          disabled: true,
          reason:
            "The local API stores a single search preset. A profiles endpoint is needed for more.",
        },
      ],
    },
    {
      id: "identity",
      label: "Identity",
      items: [
        { id: "view-profile", label: "View profile", to: profileHref },
        { id: "edit-preset", label: "Edit search preset", to: `${profileHref}#edit` },
        {
          id: "edit-requirements",
          label: "Edit requirements & skip list",
          to: `${profileHref}#requirements`,
        },
      ],
    },
    {
      id: "documents",
      label: "Documents & credentials",
      items: [
        { id: "manage-cvs", label: "Manage CVs", to: `${profileHref}#documents` },
        { id: "voice-samples", label: "Voice samples", to: `${profileHref}#documents` },
        {
          id: "add-certification",
          label: "Add certification / license",
          disabled: true,
          reason: NOT_PERSISTED_NOTE,
        },
        {
          id: "add-portfolio",
          label: "Add portfolio / case study",
          disabled: true,
          reason: NOT_PERSISTED_NOTE,
        },
        {
          id: "import-vault",
          label: "Import from vault",
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
        { id: "applications", label: "Application ledger", to: `${ROUTES.memory}#applications` },
        { id: "versions", label: "Profile version history", to: `${ROUTES.memory}#versions` },
        {
          id: "companies",
          label: "Companies I've already hit",
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
          detail: "⌘C",
          onSelect: onCopyVaultPath,
        },
        {
          id: "duplicate",
          label: "Duplicate profile",
          disabled: true,
          reason:
            "The local API stores a single search preset. A profiles endpoint is needed for more.",
        },
        {
          id: "archive",
          label: "Archive profile",
          disabled: true,
          reason:
            "The local API stores a single search preset. A profiles endpoint is needed for more.",
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
        className="sidebar__profile"
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
          {menu.open ? "⌃" : "⌄"}
        </span>
      </button>

      {menu.open ? (
        <div
          id="profile-menu"
          ref={menu.menuRef}
          className="profile-menu__popover"
          onKeyDown={menu.menuKeyDown}
        >
          <Menu
            sections={sections}
            registerItem={menu.registerItem}
            activeIndex={menu.activeIndex}
            onChoose={menu.close}
            labelledBy="profile-menu-trigger"
          />
        </div>
      ) : null}
    </div>
  );
}
