import { useSingleKeyShortcuts, setSingleKeyShortcuts } from "../../shared/useShortcuts";
import { Switch } from "../../shared/ui/Switch";

/**
 * Purpose: Settings toggle for single-key shortcuts. Does not: change Esc/⌘K/⌘Z.
 */
export function KeyboardPanel() {
  const on = useSingleKeyShortcuts();

  return (
    <article className="settings-card">
      <p className="settings-card__kicker">Keyboard</p>
      <h2 className="settings-card__title">Single-key shortcuts</h2>

      <div className="settings-card__row">
        <span>Single-key shortcuts</span>
        <Switch
          label="Single-key shortcuts"
          checked={on}
          onChange={setSingleKeyShortcuts}
        />
      </div>

      <p className="settings-card__copy">
        A, D, E, R, ⇧A, ⇧D and G Q act as soon as you press them. Turn them off if you use speech input or tend to brush the keyboard.
      </p>

      <p className="settings-card__copy settings-card__copy--muted">
        ⌘K, ⌘Z and Esc always work.
      </p>

      <p className="settings-card__copy">
        {on ? "On — keycaps on buttons are live." : "Off — keycaps are hidden. Use the buttons."}
      </p>
    </article>
  );
}
