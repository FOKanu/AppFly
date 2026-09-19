import { useState, type ReactNode } from "react";
import { Chip } from "../../shared/ui/Chip";
import { Segmented } from "../../shared/ui/Segmented";
import type { Run, StageStatus } from "./types";

/** Which window the pipeline strip reports on. */
type PipelineWindow = "last-run" | "live" | "7-nights";

const WINDOWS = [
  { value: "last-run", label: "Last run" },
  { value: "live", label: "Live" },
  { value: "7-nights", label: "7 nights" },
] as const;

interface PipelineOrganismProps {
  run: Run | null;
  /** Notes written to the vault by the last run, when the API reports them. */
  vaultNotes?: number;
  vaultPath?: string;
}

/**
 * Purpose: The Scout → Match → Write → Vault strip, one card per stage with its
 *          own counters and status light.
 * Does not: fetch listings or start a run; it only reports the last one.
 */
export function PipelineOrganism({ run, vaultNotes, vaultPath }: PipelineOrganismProps) {
  const [window, setWindow] = useState<PipelineWindow>("last-run");

  return (
    <section className="pipeline" aria-label="Pipeline">
      <header className="pipeline__head">
        <h2 className="pipeline__title">Pipeline</h2>
        <p className="pipeline__flow">Scout → Match → Write → Vault</p>
        <span className="pipeline__rule" />
        <Segmented
          options={WINDOWS}
          value={window}
          onChange={setWindow}
          ariaLabel="Pipeline window"
        />
      </header>

      <div className="pipeline__stages">
        <StageCard
          index="01"
          name="Scout"
          status={run?.stages.scout}
          rows={[
            { label: "new listings", value: num(run?.scouted) },
            { label: "sources", value: sourceMix(run) },
            { label: "refused", value: refusedHosts(run) },
          ]}
          note={run?.errors[0]}
          noteTone="policy"
        />
        <Arrow />
        <StageCard
          index="02"
          name="Match"
          status={run?.stages.match}
          rows={[
            { label: "scored", value: num(run?.scouted) },
            { label: "shortlist ≥ 7.0", value: num(run?.shortlisted) },
            { label: "skipped (filters)", value: num(run?.skipped) },
          ]}
          note="MiniLM-L6 local"
        />
        <Arrow />
        <StageCard
          index="03"
          name="Write"
          status={run?.stages.write}
          rows={[
            { label: "letters", value: writeRatio(run) },
            { label: "gemini-flash", value: "—" },
            { label: "llama3.1:8b", value: "—" },
          ]}
          note={run?.write_skipped ? `${run.write_skipped} skipped` : undefined}
          noteTone="warning"
        />
        <Arrow />
        <StageCard
          index="04"
          name="Vault"
          status={run?.stages.write}
          rows={[
            { label: "notes written", value: num(vaultNotes) },
            { label: "letters", value: num(run?.written) },
            { label: "Home.md", value: run ? "updated" : "—" },
          ]}
          note={vaultPath}
        />
      </div>
    </section>
  );
}

interface StageRow {
  label: string;
  value: ReactNode;
}

function StageCard({
  index,
  name,
  status,
  rows,
  note,
  noteTone = "muted",
}: {
  index: string;
  name: string;
  status: StageStatus | undefined;
  rows: StageRow[];
  note?: string;
  noteTone?: "muted" | "warning" | "policy";
}) {
  return (
    <article className="stage-card">
      <header className="stage-card__head">
        <span className="stage-card__index">{index}</span>
        <h3 className="stage-card__name">{name}</h3>
        <span className="stage-card__rule" />
        <Chip tone={stageTone(status)} dot pulse={status === "running"}>
          {status ?? "idle"}
        </Chip>
      </header>

      {rows.map((row) => (
        <p className="kv" key={row.label}>
          <span>{row.label}</span>
          <span className="kv__rule" />
          <span className="kv__value">{row.value}</span>
        </p>
      ))}

      <p className="stage-card__note" data-tone={noteTone}>
        {note ?? " "}
      </p>
    </article>
  );
}

function Arrow() {
  return (
    <span className="pipeline__arrow" aria-hidden="true">
      <span className="pipeline__arrow-line" />›
    </span>
  );
}

function stageTone(status: StageStatus | undefined) {
  switch (status) {
    case "done":
      return "ok" as const;
    case "running":
      return "accent" as const;
    case "failed":
      return "danger" as const;
    case "queued":
      return "warning" as const;
    default:
      return "muted" as const;
  }
}

function num(value: number | undefined): string {
  return value === undefined ? "—" : value.toLocaleString();
}

function writeRatio(run: Run | null): string {
  if (!run) return "—";
  const cap = run.written + run.write_skipped;
  return cap > 0 ? `${run.written} / ${cap} cap` : String(run.written);
}

function sourceMix(run: Run | null): string {
  if (!run) return "—";
  const parts: string[] = [];
  if (run.source_mix.api) parts.push("API");
  if (run.source_mix.rss) parts.push("RSS");
  if (run.source_mix.clips) parts.push(`${run.source_mix.clips} clips`);
  return parts.length > 0 ? parts.join(" · ") : "—";
}

function refusedHosts(run: Run | null): string {
  if (!run) return "—";
  return run.errors.length > 0 ? `${run.errors.length} host` : "0 hosts";
}
