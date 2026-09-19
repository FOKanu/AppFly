import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { ROUTES } from "../../routes";
import { getWorkspace, initWorkspace } from "../vault/api";
import type { WorkspaceStatus } from "../vault/types";

interface WorkspacePanelProps {
  onToast: (message: string) => void;
}

/** One line of the first-run checklist. */
interface ReadinessItem {
  id: string;
  label: string;
  done: boolean;
  /** Where to go to satisfy it, when it is not done. */
  to?: string;
  action?: string;
}

/**
 * Purpose: Where AppFly keeps its own files, and what is still missing before
 *          a run will produce anything useful.
 * Does not: mention Obsidian under "native" storage — importing an existing
 *           vault is a separate, optional panel. The readiness flags come
 *           straight from GET /workspace/status rather than being re-derived.
 */
export function WorkspacePanel({ onToast }: WorkspacePanelProps) {
  const [workspace, setWorkspace] = useState<WorkspaceStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [canInit, setCanInit] = useState(true);

  const load = useCallback(async () => {
    try {
      setWorkspace(await getWorkspace());
    } catch {
      setCanInit(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onInit = useCallback(async () => {
    setBusy(true);
    try {
      setWorkspace(await initWorkspace());
      onToast("App data folder created.");
    } catch {
      setCanInit(false);
      onToast("Could not create the folder — POST /workspace/init is not serving yet.");
    } finally {
      setBusy(false);
    }
  }, [onToast]);

  // Under "markdown" the Obsidian vault is the live store, not the app-data dir.
  const markdown = workspace?.storage_backend === "markdown";

  const checklist: ReadinessItem[] = [
    {
      id: "cv",
      label: "A CV stored",
      done: Boolean(workspace?.has_cv),
      to: ROUTES.vault,
      action: "Add a CV",
    },
    {
      id: "voice",
      label: "A voice sample stored",
      done: Boolean(workspace?.has_voice),
      to: ROUTES.vault,
      action: "Add a sample",
    },
    {
      id: "keywords",
      label: "A search preset with role titles",
      done: Boolean(workspace?.has_keywords),
      to: ROUTES.profiles,
      action: "Edit preset",
    },
    {
      id: "gemini",
      label: "A writer model key",
      done: Boolean(workspace?.has_gemini),
      action: "Add below",
    },
  ];

  const ready = checklist.filter((item) => item.done).length;

  return (
    <article className="settings-card">
      <p className="settings-card__kicker">
        {markdown ? "Markdown storage" : "Native storage"}
      </p>
      <h2 className="settings-card__title">
        {markdown ? "Vault location" : "App data location"}
      </h2>

      <div className="workspace-path">
        <code>{workspace?.data_path ?? "—"}</code>
        <span className="workspace-path__state" data-ready={Boolean(workspace)}>
          {workspace ? workspace.storage_backend : "unknown"}
        </span>
      </div>

      <p className="settings-card__copy">
        {markdown
          ? "This install reads and writes a markdown vault at the path above. Change it under Obsidian vault below."
          : "AppFly stores your CVs, voice samples and credentials here, on this machine. It reads and writes them directly — no external note app is required."}
      </p>

      <p className="workspace-checklist__head">
        Setup · {ready} of {checklist.length} done
      </p>
      <ul className="workspace-checklist">
        {checklist.map((item) => (
          <li className="workspace-check" key={item.id} data-done={item.done}>
            <span className="workspace-check__mark" aria-hidden="true">
              {item.done ? "✓" : ""}
            </span>
            <span className="workspace-check__label">{item.label}</span>
            {item.done ? null : item.to ? (
              <Link className="link-action" to={item.to}>
                {item.action} →
              </Link>
            ) : (
              <span className="workspace-check__hint">{item.action}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="workspace-foot">
        <span>
          {workspace?.job_count ?? 0} job note{workspace?.job_count === 1 ? "" : "s"} ·{" "}
          <Link to={ROUTES.vault}>open the Vault</Link>
        </span>
        <Button
          variant="quiet"
          size="sm"
          disabled={busy || !canInit}
          title={canInit ? undefined : "POST /workspace/init is not serving yet."}
          onClick={() => void onInit()}
        >
          {busy ? "Working…" : "Re-create folders"}
        </Button>
      </div>
    </article>
  );
}
