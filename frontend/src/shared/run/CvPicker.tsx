/**
 * Purpose: Compact CV selector for this run (M3). Metadata only.
 * Does not: fetch document text, show CV bodies, or change Vault active_cv.
 */
import { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useRun } from "./RunContext";
import type { CvOption } from "./types";

function optionLabel(cv: CvOption): string {
  const words =
    typeof cv.word_count === "number" && cv.word_count > 0 ? ` · ${cv.word_count} words` : "";
  const active = cv.active_cv ? " · active" : "";
  if (cv.extract_status === "empty") return `${cv.label} — no readable text`;
  if (cv.extract_status === "unsupported") return `${cv.label} — file type not supported`;
  if (cv.extract_status === "error") return `${cv.label} — text extraction failed`;
  return `${cv.label}${words}${active}`;
}

function isSelectable(cv: CvOption): boolean {
  return cv.extract_status === undefined || cv.extract_status === "ok";
}

/**
 * Purpose: Header control bound to shared RunContext CV fields.
 * Does not: start the run or call /documents/{id}/text.
 */
export function CvPicker() {
  const run = useRun();
  const labelId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const pickerLocked =
    run.ui === "queued" ||
    run.ui === "running" ||
    run.ui === "cancelling" ||
    run.ui === "starting" ||
    run.ui === "lost-contact";
  const selected = run.cvOptions.find((c) => c.id === run.cvId);
  const isOverride = Boolean(selected && !selected.active_cv);
  const activeLabel = run.cvOptions.find((c) => c.active_cv)?.label;

  if (run.cvState === "empty") {
    return (
      <div className="cv-picker">
        <Link className="cv-picker__empty" to="/vault">
          No CV yet — add one in Vault
        </Link>
      </div>
    );
  }

  const title =
    run.cvState === "offline"
      ? "Can't reach the local API."
      : run.cvState === "error"
        ? "Couldn't load CVs."
        : pickerLocked
          ? "Locked while a run is in progress."
          : isOverride
            ? `For this run only. Active CV stays ${activeLabel ?? "unchanged"}.`
            : undefined;

  const select = (
    <select
      id={labelId}
      className="cv-picker__select"
      aria-label="CV for this run"
      title={title}
      disabled={
        pickerLocked ||
        run.cvState === "loading" ||
        run.cvState === "offline" ||
        run.cvState === "error"
      }
      value={run.cvId ?? ""}
      onChange={(event) => {
        const next = event.target.value || null;
        run.setCvId(next);
        setSheetOpen(false);
      }}
    >
      {run.cvState === "loading" ? (
        <option value="">CV: loading…</option>
      ) : run.cvState === "offline" || run.cvState === "error" ? (
        <option value="">CV: —</option>
      ) : (
        run.cvOptions.map((cv) => (
          <option key={cv.id} value={cv.id} disabled={!isSelectable(cv)}>
            {optionLabel(cv)}
          </option>
        ))
      )}
    </select>
  );

  return (
    <div className="cv-picker">
      <label className="cv-picker__label" htmlFor={labelId}>
        CV for this run
      </label>
      <div className="cv-picker__desktop">{select}</div>
      <button
        type="button"
        className="cv-picker__icon"
        aria-label="CV for this run"
        aria-expanded={sheetOpen}
        title={run.cvLabel ? `CV: ${run.cvLabel}` : "CV for this run"}
        disabled={pickerLocked || run.cvState === "loading"}
        onClick={() => setSheetOpen((open) => !open)}
      >
        CV
        {isOverride ? <span className="cv-picker__dot" aria-hidden /> : null}
      </button>
      {sheetOpen ? (
        <div className="cv-picker__sheet" role="dialog" aria-label="CV for this run">
          {select}
          <button type="button" className="cv-picker__sheet-close" onClick={() => setSheetOpen(false)}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}
