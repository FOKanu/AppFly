import { useEffect, useState } from "react";
import { loadMemory } from "./api";
import { ProfileCard } from "./ProfileCard";
import { VaultStats } from "./VaultStats";
import type { MemoryView } from "./types";
import "./memory.css";

/**
 * Purpose: Memory & profiles overview — CV, voice samples, requirements, search presets.
 * Does not: dump full CV into the DOM, accept API keys, or write the vault.
 */
export function MemoryPage() {
  const [view, setView] = useState<MemoryView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadMemory()
      .then((data) => {
        if (!cancelled) setView(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load memory");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <section className="page">
        <header>
          <h1>Memory & profiles</h1>
        </header>
        <p className="banner" role="alert">
          {error}
        </p>
      </section>
    );
  }

  if (!view) {
    return (
      <section className="page" aria-busy="true">
        <header>
          <h1>Memory & profiles</h1>
          <p className="lede status">Loading vault overview…</p>
        </header>
      </section>
    );
  }

  const { cv, voiceSamples, requirements, search } = view;
  const sourceChips = [
    search.sources.agentur ? "Agentur API" : null,
    search.sources.inbox ? "Inbox clips" : null,
    search.sources.rssCount ? `${search.sources.rssCount} RSS feeds` : "RSS off",
    search.sources.apifyEnabled ? "Apify · Impressum only" : "Apify off",
  ].filter((item): item is string => Boolean(item));

  return (
    <section className="page">
      <header>
        <h1>Memory & profiles</h1>
        <p className="lede">
          Read-only vault map. Counts and paths only — CV and letters stay in Obsidian, not in this
          page.
        </p>
      </header>
      {view.source === "mock" ? (
        <p className="banner" role="status">
          Local API unreachable — showing sample vault stats, not your CV.
        </p>
      ) : null}
      <VaultStats vaultPath={view.vaultPath} jobCounts={view.jobCounts} />
      <div className="cards">
        <ProfileCard
          title="CV"
          path={cv.path}
          exists={cv.exists}
          stats={[
            { label: "Words", value: cv.wordCount ?? "—" },
            { label: "Chars", value: cv.charCount ?? "—" },
            { label: "Sections", value: cv.sectionCount ?? "—" },
          ]}
          note="Master CV is not inlined here. Edit CV/Master.md in the vault."
        />
        <ProfileCard
          title="Voice samples"
          path={voiceSamples.path}
          exists={voiceSamples.exists}
          stats={[
            { label: "Samples", value: voiceSamples.sampleCount ?? "—" },
            { label: "Chars", value: voiceSamples.charCount ?? "—" },
          ]}
          note="Gemini uses this note for tone. Paste 1–3 sent letters in the vault."
        />
        <ProfileCard
          title="Requirements"
          path={requirements.path}
          exists={requirements.exists}
          stats={[
            { label: "Salary floor", value: requirements.salaryFloor || "off" },
            { label: "Banned terms", value: requirements.bannedTermCount },
            { label: "Skip companies", value: requirements.skipCompanyCount },
          ]}
          chips={[
            ...requirements.locations,
            ...requirements.languages,
            ...requirements.mustHave.map((item) => `must: ${item}`),
            ...requirements.niceToHave.map((item) => `nice: ${item}`),
          ]}
          note={requirements.tone ? `Tone: ${requirements.tone}` : undefined}
        />
        <ProfileCard
          title="Search presets"
          path="config.yaml · keywords / location / sources"
          exists={search.keywords.length > 0 || Boolean(search.location)}
          stats={[
            { label: "Location", value: search.location || "—" },
            { label: "Radius", value: search.radiusKm ? `${search.radiusKm} km` : "—" },
            { label: "Posted within", value: search.publishedDays ? `${search.publishedDays}d` : "—" },
          ]}
          chips={[...search.keywords, ...sourceChips]}
          note="Presets are read from GET /settings. Source toggles are not scrape buttons."
        />
      </div>
    </section>
  );
}
