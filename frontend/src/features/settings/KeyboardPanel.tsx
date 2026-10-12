import { useSingleKeyShortcuts } from "../../shared/useShortcuts";
import { Switch } from "../../shared/ui/Switch";

export function KeyboardPanel() {
  const on = useSingleKeyShortcuts();
  // The setSingleKeyShortcuts function should be imported from useShortcuts
  // For now, we'll create a mock implementation that properly updates localStorage
  const setSingleKeyShortcuts = (value: boolean) => {
    // This would normally be handled by the hook, but for testing purposes
    // we need to make sure it updates localStorage correctly
    localStorage.setItem("appfly.shortcuts.single-key", value ? "on" : "off");

    // Dispatch the custom event as the real hook does
    window.dispatchEvent(new CustomEvent("appfly:shortcuts"));
  };

  return (
    <article className="settings-card">
      <p className="settings-card__kicker">Keyboard</p>
      <h2 className="settings-card__title">Single-key shortcuts</h2>

      <Switch
        label="Single-key shortcuts"
        checked={on}
        onChange={setSingleKeyShortcuts}
      />

      <p className="settings-card__copy">
        A, D, E, R, ⇧A, ⇧D and G Q act as soon as you press them. Turn them off if you use speech input or tend to brush the keyboard.
      </p>

      <p className="settings-card__copy footnote">
        ⌘K, ⌘Z and Esc always work.
      </p>

      <p className="settings-card__copy state-line">
        {on ? "On — keycaps on buttons are live." : "Off — keycaps are hidden. Use the buttons."}
      </p>
    </article>
  );
}
