import type { FormEvent, RefObject } from "react";
import type { HeartbeatState } from "../../shared/api/client";
import { CvPicker } from "../../shared/run/CvPicker";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Heartbeat } from "./Heartbeat";

/** G5: nothing in the app can pause launchd yet, so the control is shown disabled. */
const PAUSE_TITLE = "The nightly schedule runs from launchd; pausing it from the app isn't supported yet.";

interface ControlHeaderProps {
  /** Breadcrumb / context line above the title. */
  kicker: string;
  title: string;
  heartbeat: HeartbeatState;
  heartbeatMessage?: string;
  searchValue: string;
  searchRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  /** Submitting the search jumps to the Queue filtered by the term. */
  onSearchSubmit: () => void;
  onRunNow: () => void;
  onStop: () => void;
  runDisabled?: boolean;
  /** Stop is only live while something is in flight. */
  stopDisabled?: boolean;
  /** "Stop", or "Stopping..." while a cancel is in flight (G6). */
  stopLabel?: string;
  /** Title on Stop, e.g. "No run in progress." (G6). */
  stopTitle?: string;
  /** Title on Run now while it is disabled (G7). */
  runTitle?: string;
}

/**
 * Purpose: 60px chrome header — breadcrumb + title, ⌘K search, heartbeat pill,
 *          and the three run controls.
 * Does not: write letters, open Easy Apply, or accept API keys.
 */
export function ControlHeader({
  kicker,
  title,
  heartbeat,
  heartbeatMessage,
  searchValue,
  searchRef,
  onSearchChange,
  onSearchSubmit,
  onRunNow,
  onStop,
  runDisabled = false,
  stopDisabled = false,
  stopLabel = "Stop",
  stopTitle,
  runTitle,
}: ControlHeaderProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSearchSubmit();
  }

  return (
    <header className="control-header">
      <div className="control-header__title-col">
        <p className="control-header__kicker">{kicker}</p>
        <h1 className="control-header__title">{title}</h1>
      </div>

      <form className="control-header__search" onSubmit={handleSubmit} role="search">
        <Input
          ref={searchRef}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search jobs, companies, runs"
          hint={searchShortcutHint()}
          aria-label="Search jobs, companies, runs"
          autoComplete="off"
          spellCheck={false}
        />
      </form>

      <Heartbeat state={heartbeat} message={heartbeatMessage} />

      <div className="control-header__runs">
        <CvPicker />
        <Button
          variant="primary"
          icon="▶"
          shortcut="R"
          onClick={onRunNow}
          disabled={runDisabled}
          title={runTitle || undefined}
        >
          Run now
        </Button>
        <Button variant="quiet" icon={"\u2016"} disabled title={PAUSE_TITLE}>
          Pause nightly
        </Button>
        <Button
          variant="quiet"
          icon={"\u25a0"}
          onClick={onStop}
          disabled={stopDisabled}
          title={stopTitle || undefined}
        >
          {stopLabel}
        </Button>
      </div>
    </header>
  );
}

/**
 * Purpose: Shortcut caption for the header search field.
 * Does not: bind the actual keydown handler (AppShell owns that).
 */
export function searchShortcutHint(): string {
  if (typeof navigator === "undefined") return "Ctrl K";
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";
}
