import { useState, type ReactNode } from "react";
import { Chip } from "../../shared/ui/Chip";
import { Segmented } from "../../shared/ui/Segmented";
import { refusalsOf } from "./api";
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
          note={refusalsOf(run)?.[0]}
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
          status={vaultStatus(run)}
          rows={[
            { label: "notes written", value: num(vaultNotes) },
            { label: "letters", value: num(run?.written) },
            { label: "Home.md", value: homeUpdated(run) ? "updated" : "\u2014" },
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
        <Chip tone={stageTone(status)} dot pulse={status === "running" || status === "in flight"}>
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
    case "in flight":
      return "accent" as const;
    case "running":
      return "accent" as const;
    case "failed":
      return "danger" as const;
    case "queued":
      return "warning" as const;
    case "stopped":
      return "neutral" as const;
    default:
      return "muted" as const;
  }
}

function num(value: number | undefined): string {
  return value === undefined ? "—" : value.toLocaleString();
}

/** Letters written; `{w} / {cap} cap` only when the run reports a cap (the live run), else `{w}`. */
function writeRatio(run: Run | null): string {
  if (!run || run.written === undefined) return "\u2014";
  const cap = run.write_cap;
  return typeof cap === "number" ? `${run.written} / ${cap} cap` : String(run.written);
}

function sourceMix(run: Run | null): string {
  if (!run || !run.source_mix) return "\u2014";
  const parts: string[] = [];
  if (run.source_mix.api) parts.push("API");
  if (run.source_mix.rss) parts.push("RSS");
  if (run.source_mix.clips) parts.push(`${run.source_mix.clips} clips`);
  return parts.length > 0 ? parts.join(" \u00b7 ") : "\u2014";
}

/** D6: counted from real refusal strings only; a dash when the run does not report them. */
function refusedHosts(run: Run | null): string {
  const refusals = refusalsOf(run);
  if (refusals === null) return "\u2014";
  return refusals.length === 1 ? "1 host" : `${refusals.length} hosts`;
}

/** D2/D5: Vault is queued while a run is going, else done when letters were written, else idle. */
function vaultStatus(run: Run | null): StageStatus | undefined {
  if (!run) return undefined;
  const write = run.stages.write;
  if (write === "in flight" || write === "queued" || write === "running") return "queued";
  return (run.written ?? 0) > 0 ? "done" : "idle";
}

/** Home.md reads "updated" only after a run the pipeline returned from normally (or a day note). */
function homeUpdated(run: Run | null): boolean {
  if (!run) return false;
  if (run.kind === "day_note") return true;
  return run.status === "completed" || run.status === "completed_with_errors" || run.status === "cancelled";
}
