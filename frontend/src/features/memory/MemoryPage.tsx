import { useEffect, useMemo, useState } from "react";
import { loadMemory } from "./api";
import { CvAndVoice } from "./CvAndVoice";
import { ProfileList, SkipCompanies, type SearchProfile } from "./ProfileList";
import { ProfileSettings, type ProfileSettingsValue } from "./ProfileSettings";
import type { MemoryView } from "./types";
import "./memory.css";

const EMPTY_SETTINGS: ProfileSettingsValue = {
  roleTitles: [],
  seniority: "senior",
  salaryFloor: null,
  workMode: "hybrid",
};

/**
 * Purpose: Memory & profiles — search presets, the CV/voice the writer is given,
 *          per-profile settings, and the global skip-company list.
 * Does not: render the CV or letter bodies. Paths, counts and structure only.
 */
export function MemoryPage() {
  const [view, setView] = useState<MemoryView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<ProfileSettingsValue>(EMPTY_SETTINGS);
  const [skipCompanies, setSkipCompanies] = useState<string[]>([]);
  const [saveNote, setSaveNote] = useState<string | undefined>(undefined);

  useEffect(() => {
    document.title = "AppFly · Memory";
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadMemory()
      .then((data) => {
        if (cancelled) return;
        setView(data);
        setSettings({
          roleTitles: data.search.keywords,
          seniority: "senior",
          salaryFloor: data.requirements.salaryFloor || null,
          workMode: "hybrid",
        });
        setSkipCompanies([]);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load memory");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const profiles = useMemo<SearchProfile[]>(() => profilesFrom(view), [view]);
  const selectedId = activeId ?? profiles[0]?.id ?? null;
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null;
  const profileName = selected?.name ?? "No profile";

  if (error) {
    return (
      <div className="memory">
        <p className="memory__banner" role="alert">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="memory" aria-busy={view ? undefined : true}>
      {view?.source === "mock" ? (
        <p className="memory__banner" role="status">
          Local API unreachable — showing sample vault stats, not your CV.
        </p>
      ) : null}

      <div className="memory__columns">
        <div className="memory__col">
          <ProfileList
            profiles={profiles}
            activeId={selectedId}
            onSelect={setActiveId}
            onNew={() => setSaveNote("Creating profiles needs a write endpoint that is not wired yet.")}
          />
          <SkipCompanies companies={skipCompanies} onChange={setSkipCompanies} />
        </div>

        <div className="memory__col">
          <CvAndVoice
            profileName={profileName}
            cv={view?.cv ?? { path: "—", exists: false }}
            voice={view?.voiceSamples ?? { path: "—", exists: false }}
            onOpenInObsidian={() =>
              setSaveNote("Open the vault in Obsidian on this machine to edit the CV.")
            }
            onReplaceSample={() =>
              setSaveNote("Replace the voice sample in the vault; this page never holds it.")
            }
          />
          <ProfileSettings
            profileName={profileName}
            value={settings}
            onChange={setSettings}
            onDelete={() => setSaveNote("Deleting profiles needs a write endpoint.")}
            onSave={() => setSaveNote("Local to this session — the profile write endpoint is not wired yet.")}
            saveNote={saveNote}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Purpose: Build the profile list from what GET /settings exposes today.
 * Does not: invent profiles — the API carries one search preset, so that is
 *           the one profile shown until a profiles endpoint lands.
 */
function profilesFrom(view: MemoryView | null): SearchProfile[] {
  if (!view) return [];
  const name =
    [view.search.keywords[0], view.search.location].filter(Boolean).join(" — ") ||
    "Default preset";
  return [
    {
      id: "default",
      name,
      detail: [
        view.search.keywords.slice(1).join(" · "),
        view.search.radiusKm ? `${view.search.radiusKm} km` : "",
        view.search.publishedDays ? `posted ≤ ${view.search.publishedDays}d` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      shortlisted: view.jobCounts.shortlist,
      applied: view.jobCounts.applied,
      scoreFloor: undefined,
    },
  ];
}
