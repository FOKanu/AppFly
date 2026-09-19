import type { FormEvent, RefObject } from "react";
import type { HeartbeatState } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Heartbeat } from "./Heartbeat";

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
  onPauseNightly: () => void;
  onStop: () => void;
  runDisabled?: boolean;
  /** Stop is only live while something is in flight. */
  stopDisabled?: boolean;
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
  onPauseNightly,
  onStop,
  runDisabled = false,
  stopDisabled = false,
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
        <Button
          variant="primary"
          icon="▶"
          shortcut="R"
          onClick={onRunNow}
          disabled={runDisabled}
        >
          Run now
        </Button>
        <Button variant="quiet" icon="‖" onClick={onPauseNightly}>
          Pause nightly
        </Button>
        <Button variant="quiet" icon="■" onClick={onStop} disabled={stopDisabled}>
          Stop
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
