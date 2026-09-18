import type { FormEvent, RefObject } from "react";
import type { HeartbeatState } from "../../shared/api/client";
import { Button } from "../../shared/ui/Button";
import { Input } from "../../shared/ui/Input";
import { Heartbeat } from "./Heartbeat";

interface ControlHeaderProps {
  title: string;
  heartbeat: HeartbeatState;
  heartbeatMessage?: string;
  searchValue: string;
  searchRef: RefObject<HTMLInputElement | null>;
  onSearchChange: (value: string) => void;
  onRunNow: () => void;
  onPauseNightly: () => void;
  onStop: () => void;
  runDisabled?: boolean;
}

/**
 * Purpose: Sticky chrome header — title, ⌘K search, heartbeat, run controls.
 * Does not: write letters, open Easy Apply, or accept API keys.
 */
export function ControlHeader({
  title,
  heartbeat,
  heartbeatMessage,
  searchValue,
  searchRef,
  onSearchChange,
  onRunNow,
  onPauseNightly,
  onStop,
  runDisabled = false,
}: ControlHeaderProps) {
  function handleSubmit(event: FormEvent) {
    event.preventDefault();
  }

  return (
    <header className="control-header">
      <h1 className="control-header__title">{title}</h1>
      <form className="control-header__search" onSubmit={handleSubmit} role="search">
        <Input
          ref={searchRef}
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search jobs, companies…"
          hint={searchShortcutHint()}
          aria-label="Search"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
      <div className="control-header__status">
        <Heartbeat state={heartbeat} message={heartbeatMessage} />
      </div>
      <div className="control-header__runs">
        <Button variant="primary" shortcut="R" onClick={onRunNow} disabled={runDisabled}>
          Run now
        </Button>
        <Button variant="quiet" onClick={onPauseNightly}>
          Pause nightly
        </Button>
        <Button variant="danger" onClick={onStop}>
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
