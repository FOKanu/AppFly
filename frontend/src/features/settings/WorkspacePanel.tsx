import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../shared/ui/Button";
import { ROUTES } from "../../routes";
import { getWorkspace, initWorkspace, listDocuments } from "../vault/api";
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
 * Purpose: Where AppFly keeps your files, and whether that location is ready.
 * Does not: mention Obsidian — importing an existing vault is a separate,
 *           optional panel. AppFly owns its storage natively.
 */
export function WorkspacePanel({ onToast }: WorkspacePanelProps) {
  const [workspace, setWorkspace] = useState<WorkspaceStatus | null>(null);
  const [documents, setDocuments] = useState({ cv: 0, voice: 0, total: 0 });
  const [busy, setBusy] = useState(false);
  const [storeLive, setStoreLive] = useState(false);

  const load = useCallback(async () => {
    const [status, snapshot] = await Promise.all([
      getWorkspace().catch(() => null),
      listDocuments().catch(() => null),
    ]);
    if (status) setWorkspace(status);
    if (snapshot) {
      setStoreLive(snapshot.availability === "live");
      setDocuments({
        cv: snapshot.documents.filter((doc) => doc.kind === "cv").length,
        voice: snapshot.documents.filter((doc) => doc.kind === "voice").length,
        total: snapshot.documents.length,
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onInit = useCallback(async () => {
    setBusy(true);
    try {
      const next = await initWorkspace();
      setWorkspace(next);
      onToast("App data folder created.");
    } catch {
      onToast("Could not create the folder — /workspace/init is not serving yet.");
    } finally {
      setBusy(false);
    }
  }, [onToast]);

  const checklist: ReadinessItem[] = [
    {
      id: "folder",
      label: "App data folder created",
      done: Boolean(workspace?.initialised),
      action: "Create",
    },
    {
      id: "cv",
      label: "At least one CV stored",
      done: documents.cv > 0,
      to: ROUTES.vault,
      action: "Add a CV",
    },
    {
      id: "voice",
      label: "Voice sample stored",
      done: documents.voice > 0,
      to: ROUTES.vault,
      action: "Add a sample",
    },
    {
      id: "profile",
      label: "A search preset with role titles",
      done: true,
      to: ROUTES.profiles,
      action: "Edit preset",
    },
  ];

  const ready = checklist.filter((item) => item.done).length;

  return (
    <article className="settings-card">
      <p className="settings-card__kicker">Native storage</p>
      <h2 className="settings-card__title">App data location</h2>

      <div className="workspace-path">
        <code>{workspace?.path ?? "—"}</code>
        <span className="workspace-path__state" data-ready={workspace?.initialised ?? false}>
          {workspace?.initialised ? "ready" : "not created"}
        </span>
      </div>

      <p className="settings-card__copy">
        AppFly stores your CVs, voice samples and credentials here, on this machine. It reads
        and writes them directly — no external note app is required.
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
              <Button
                variant="quiet"
                size="sm"
                disabled={busy || !storeLive}
                title={
                  storeLive ? undefined : "POST /workspace/init is not serving yet."
                }
                onClick={() => void onInit()}
              >
                {busy ? "Working…" : item.action}
              </Button>
            )}
          </li>
        ))}
      </ul>

      <p className="settings-card__copy">
        {documents.total} file{documents.total === 1 ? "" : "s"} stored ·{" "}
        <Link to={ROUTES.vault}>open the Vault</Link>
      </p>
    </article>
  );
}
