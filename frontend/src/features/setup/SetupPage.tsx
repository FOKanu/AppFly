import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ROUTES } from "../../routes";
import { describeApiError, isUnreachable, type ApiFailure } from "../../shared/api/errors";
import { Banner } from "../../shared/ui/Banner";
import { Button } from "../../shared/ui/Button";
import { ConnectorKeyField } from "../settings/ConnectorKeyField";
import { putConnectorSecret } from "../settings/settingsApi";
import { UploadZone } from "../vault/UploadZone";
import { getWorkspace, initWorkspace, uploadDocument } from "../vault/api";
import type { VaultDocument, WorkspaceStatus } from "../vault/types";
import { SETUP_DISMISSED_KEY } from "./constants";
import "./setup.css";
import "../vault/vault.css";

type Step = 1 | 2 | 3 | "done";

/**
 * Purpose: First-launch wizard — init store, paste Gemini key, upload CV.
 * Does not: Render CV bodies, echo keys, or fetch job-board URLs.
 */
export function SetupPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [workspace, setWorkspace] = useState<WorkspaceStatus | null>(null);
  const [bootFailure, setBootFailure] = useState<ApiFailure | null>(null);
  const [booting, setBooting] = useState(true);

  const [initBusy, setInitBusy] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [initDone, setInitDone] = useState(false);
  const initStarted = useRef(false);

  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadDoc, setUploadDoc] = useState<VaultDocument | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const status = await getWorkspace();
    setWorkspace(status);
    setBootFailure(null);
    return status;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await refresh();
        if (cancelled) return;
        if (status.has_gemini && status.has_cv) {
          setStep("done");
          setInitDone(true);
        }
      } catch (error) {
        if (!cancelled) {
          setBootFailure(describeApiError(error, "Checking your setup"));
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    if (booting || bootFailure || step !== 1 || initDone || initStarted.current) return;
    initStarted.current = true;
    let cancelled = false;
    (async () => {
      setInitBusy(true);
      setInitError(null);
      try {
        const status = await initWorkspace();
        if (cancelled) return;
        setWorkspace(status);
        setInitDone(true);
      } catch (error) {
        if (!cancelled) {
          setInitError(describeApiError(error, "Creating the app data folder").message);
        }
      } finally {
        if (!cancelled) setInitBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [booting, bootFailure, step, initDone]);

  function dismiss() {
    try {
      localStorage.setItem(SETUP_DISMISSED_KEY, "1");
    } catch {
      /* ignore quota / private mode */
    }
    navigate(ROUTES.tonight, { replace: true });
  }

  function finishToTonight() {
    try {
      localStorage.removeItem(SETUP_DISMISSED_KEY);
    } catch {
      /* ignore */
    }
    navigate(ROUTES.tonight, { replace: true });
  }

  async function onSaveKey(value: string) {
    await putConnectorSecret("GEMINI_API_KEY", value);
    await refresh();
  }

  async function onUpload(files: File[]) {
    const file = files[0];
    if (!file) return;
    setUploadBusy(true);
    setUploadError(null);
    try {
      const doc = await uploadDocument(file, "cv", true);
      setUploadDoc(doc);
      await refresh();
    } catch (error) {
      const failure = describeApiError(error, "Uploading CV");
      setUploadError(
        failure.message.includes("413") || failure.message.toLowerCase().includes("too large")
          ? "That file is over 8 MB."
          : failure.message,
      );
    } finally {
      setUploadBusy(false);
    }
  }

  if (booting) {
    return (
      <div className="setup">
        <div className="setup__checking">Checking your setup…</div>
      </div>
    );
  }

  if (bootFailure && isUnreachable(bootFailure.kind)) {
    return (
      <div className="setup">
        <header className="setup__bar">
          <span className="setup__brand">AppFly</span>
          <Button variant="quiet" size="sm" onClick={dismiss}>
            Set up later
          </Button>
        </header>
        <div className="setup__body">
          <div className="setup__panel">
            <Banner tone="warning" title="The local engine isn't responding">
              <p className="setup__copy">
                If you just opened AppFly, give it a few seconds.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setBooting(true);
                  void refresh()
                    .then((status) => {
                      if (status.has_gemini && status.has_cv) setStep("done");
                    })
                    .catch((error) => {
                      setBootFailure(describeApiError(error, "Checking your setup"));
                    })
                    .finally(() => setBooting(false));
                }}
              >
                Retry
              </Button>
            </Banner>
          </div>
        </div>
      </div>
    );
  }

  const markdown = workspace?.storage_backend === "markdown";

  return (
    <div className="setup">
      <header className="setup__bar">
        <span className="setup__brand">AppFly</span>
        {step !== "done" ? (
          <Button variant="quiet" size="sm" onClick={dismiss}>
            Set up later
          </Button>
        ) : null}
      </header>

      <div className="setup__body">
        <div className="setup__panel">
          {step !== "done" ? (
            <ol className="setup__steps" aria-label="Setup progress">
              <li data-active={step === 1} data-done={step !== 1} />
              <li data-active={step === 2} data-done={typeof step === "number" && step > 2} />
              <li data-active={step === 3} data-done={false} />
            </ol>
          ) : null}

          {step === 1 ? (
            <>
              <p className="setup__kicker">Step 1 of 3</p>
              <h1 className="setup__title">Your workspace</h1>
              <p className="setup__copy">
                {markdown
                  ? "This install uses your markdown vault at:"
                  : "AppFly keeps your CVs, samples and keys on this machine, here:"}
              </p>
              {initBusy ? (
                <p className="setup__copy">Creating your app data folder…</p>
              ) : null}
              {initDone && workspace ? (
                <div className="setup__ok">
                  <span className="setup__ok-mark" aria-hidden="true">
                    ✓
                  </span>
                  <code className="setup__path">{workspace.data_path}</code>
                </div>
              ) : null}
              {initError ? (
                <Banner tone="danger" title="Couldn't create the app data folder" role="alert">
                  <p className="setup__error">{initError}</p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      initStarted.current = false;
                      setInitDone(false);
                      setInitError(null);
                    }}
                  >
                    Try again
                  </Button>
                </Banner>
              ) : null}
              <div className="setup__actions">
                <Button
                  variant="primary"
                  disabled={!initDone}
                  onClick={() => setStep(2)}
                >
                  Next
                </Button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <p className="setup__kicker">Step 2 of 3</p>
              <h1 className="setup__title">Writer model key</h1>
              <p className="setup__copy">
                Paste your Gemini API key. It goes straight to the system keychain and is never
                shown again.
              </p>
              {workspace?.has_gemini ? (
                <div className="setup__ok">
                  <span className="setup__ok-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>A key is already stored.</span>
                </div>
              ) : null}
              <ConnectorKeyField
                name="GEMINI_API_KEY"
                configured={Boolean(workspace?.has_gemini)}
                onSave={onSaveKey}
              />
              <div className="setup__actions">
                <Button variant="primary" onClick={() => setStep(3)}>
                  Next
                </Button>
                <button type="button" className="link-quiet" onClick={() => setStep(3)}>
                  Skip for now
                </button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <p className="setup__kicker">Step 3 of 3</p>
              <h1 className="setup__title">Your CV</h1>
              <p className="setup__copy">
                Add the CV you want AppFly to write from. PDF, DOCX, or TXT/MD.
              </p>
              {workspace?.has_cv && !uploadDoc ? (
                <div className="setup__ok">
                  <span className="setup__ok-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>A CV is already stored.</span>
                </div>
              ) : null}
              {uploadDoc?.extract_status === "ok" ? (
                <div className="setup__ok">
                  <span className="setup__ok-mark" aria-hidden="true">
                    ✓
                  </span>
                  <span>CV stored: {uploadDoc.label}.</span>
                </div>
              ) : null}
              {uploadDoc &&
              (uploadDoc.extract_status === "empty" ||
                uploadDoc.extract_status === "unsupported" ||
                uploadDoc.extract_status === "error") ? (
                <Banner
                  tone="warning"
                  title={
                    uploadDoc.extract_status === "empty"
                      ? `Stored ${uploadDoc.label}, but no text could be read.`
                      : `Stored ${uploadDoc.label}, but this format can't be read yet.`
                  }
                >
                  <p className="setup__copy">
                    {uploadDoc.extract_status === "empty"
                      ? "Scanned PDF? Try a text PDF or DOCX."
                      : "Try PDF, DOCX or TXT."}
                  </p>
                </Banner>
              ) : null}
              {uploadError ? (
                <p className="setup__error" role="alert">
                  {uploadError}
                </p>
              ) : null}
              <UploadZone
                onUpload={(files) => void onUpload(files)}
                enabled={!uploadBusy}
                disabledReason="Uploading…"
                busy={uploadBusy}
                initialKind="cv"
                lockKind="cv"
              />
              <div className="setup__actions">
                <Button variant="primary" onClick={() => setStep("done")}>
                  Finish
                </Button>
                <button type="button" className="link-quiet" onClick={() => setStep("done")}>
                  Skip for now
                </button>
              </div>
            </>
          ) : null}

          {step === "done" ? (
            <>
              <p className="setup__kicker">Ready</p>
              <h1 className="setup__title">Setup done</h1>
              <p className="setup__copy">
                You&apos;re set up. Voice sample and search keywords are optional; add them any
                time.
              </p>
              <ul className="setup__checklist">
                <li className="setup__check" data-done={Boolean(workspace?.has_cv)}>
                  <span className="setup__check-mark" aria-hidden="true">
                    {workspace?.has_cv ? "✓" : "·"}
                  </span>
                  <span>A CV stored</span>
                  {!workspace?.has_cv ? (
                    <Link to={ROUTES.vault}>Add a CV</Link>
                  ) : null}
                </li>
                <li className="setup__check" data-done={Boolean(workspace?.has_voice)}>
                  <span className="setup__check-mark" aria-hidden="true">
                    {workspace?.has_voice ? "✓" : "·"}
                  </span>
                  <span>A voice sample stored</span>
                  {!workspace?.has_voice ? (
                    <Link to={ROUTES.vault}>Add a sample</Link>
                  ) : null}
                </li>
                <li className="setup__check" data-done={Boolean(workspace?.has_keywords)}>
                  <span className="setup__check-mark" aria-hidden="true">
                    {workspace?.has_keywords ? "✓" : "·"}
                  </span>
                  <span>A search preset with role titles</span>
                  {!workspace?.has_keywords ? (
                    <Link to={ROUTES.profiles}>Edit preset</Link>
                  ) : null}
                </li>
                <li className="setup__check" data-done={Boolean(workspace?.has_gemini)}>
                  <span className="setup__check-mark" aria-hidden="true">
                    {workspace?.has_gemini ? "✓" : "·"}
                  </span>
                  <span>A writer model key</span>
                  {!workspace?.has_gemini ? (
                    <Link to={ROUTES.settings}>Add in Settings</Link>
                  ) : null}
                </li>
              </ul>
              <div className="setup__actions">
                <Button variant="primary" onClick={finishToTonight}>
                  Go to Tonight
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
