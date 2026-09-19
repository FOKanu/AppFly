import type { VaultFileStats } from "./types";

interface CvAndVoiceProps {
  profileName: string;
  cv: VaultFileStats;
  voice: VaultFileStats;
  onOpenInObsidian: () => void;
  onReplaceSample: () => void;
}

/**
 * Purpose: What the writer is given for tone and history — the CV master and the
 *          voice sample, both living in Obsidian.
 * Does not: render the CV body. Memory shows paths, counts and structure only,
 *           so the vault's contents never land in the DOM.
 */
export function CvAndVoice({
  profileName,
  cv,
  voice,
  onOpenInObsidian,
  onReplaceSample,
}: CvAndVoiceProps) {
  return (
    <section className="memory-card" aria-labelledby="cv-title">
      <header className="memory-card__head">
        <div>
          <p className="memory-card__kicker">{profileName}</p>
          <h2 id="cv-title" className="memory-card__title">
            CV &amp; voice samples
          </h2>
        </div>
        <span className="memory-card__sync">
          {cv.exists ? "synced" : "missing"} · {cv.path}
        </span>
      </header>

      <div className="memory-panes">
        <div className="memory-pane">
          <p className="memory-pane__label">CV master</p>
          <div className="memory-pane__box">
            <p className="memory-pane__note">
              The CV body stays in Obsidian and is never rendered here.
            </p>
            <dl className="memory-stats">
              <StatRow label="File" value={cv.path} mono />
              <StatRow label="Present" value={cv.exists ? "yes" : "no"} />
              <StatRow label="Words" value={format(cv.wordCount)} />
              <StatRow label="Sections" value={format(cv.sectionCount)} />
            </dl>
          </div>
          <button type="button" className="link-action" onClick={onOpenInObsidian}>
            ↗ Open in Obsidian
          </button>
        </div>

        <div className="memory-pane">
          <p className="memory-pane__label">Voice sample</p>
          <div className="memory-pane__box">
            <p className="memory-pane__note">
              Used to steer letter tone. Paste one to three letters you have already sent, in
              the vault.
            </p>
            <dl className="memory-stats">
              <StatRow label="File" value={voice.path} mono />
              <StatRow label="Present" value={voice.exists ? "yes" : "no"} />
              <StatRow label="Samples" value={format(voice.sampleCount)} />
              <StatRow label="Chars" value={format(voice.charCount)} />
            </dl>
          </div>
          <button type="button" className="link-action" onClick={onReplaceSample}>
            ↻ Replace sample
          </button>
        </div>
      </div>
    </section>
  );
}

function StatRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="memory-stats__row">
      <dt>{label}</dt>
      <dd className={mono ? "mono-path" : undefined}>{value}</dd>
    </div>
  );
}

function format(value: number | undefined): string {
  return value === undefined ? "—" : value.toLocaleString();
}
