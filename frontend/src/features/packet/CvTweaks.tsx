import { useState } from "react";
import { Button } from "../../shared/ui/Button";
import { Tag } from "../../shared/ui/Tag";

/** One suggested rewrite of a CV bullet for this role. */
export interface CvTweak {
  id: string;
  /** The bullet as it reads in CV.md today. */
  before: string;
  /** The rewrite proposed for this role. */
  after: string;
}

interface CvTweaksProps {
  tweaks: CvTweak[];
  /** Which CV slice the writer was given, e.g. "slice 3/9". */
  slice?: string;
}

/**
 * Purpose: Per-role CV bullet rewrites you accept one at a time.
 * Does not: render the CV body — only the single bullet each tweak touches.
 */
export function CvTweaks({ tweaks, slice }: CvTweaksProps) {
  const [accepted, setAccepted] = useState<ReadonlySet<string>>(new Set());

  function toggle(id: string) {
    setAccepted((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="cv-tweaks">
      <header className="cv-tweaks__head">
        <h2 className="cv-tweaks__title">CV bullet tweaks for this role</h2>
        <Tag>CV.md · {slice ?? "—"}</Tag>
        <span className="cv-tweaks__rule" />
        <span className="cv-tweaks__count">
          {accepted.size} of {tweaks.length} accepted
        </span>
      </header>

      {tweaks.length === 0 ? (
        <p className="cv-tweaks__empty">
          No bullet rewrites suggested for this role yet.
        </p>
      ) : (
        <ul className="cv-tweaks__list">
          {tweaks.map((tweak) => (
            <li className="cv-tweak" key={tweak.id}>
              <span className="cv-tweak__col">
                <span className="cv-tweak__before">{tweak.before}</span>
                <span className="cv-tweak__after">{tweak.after}</span>
              </span>
              {accepted.has(tweak.id) ? (
                <button
                  type="button"
                  className="cv-tweak__accepted"
                  onClick={() => toggle(tweak.id)}
                >
                  ✓ Accepted
                </button>
              ) : (
                <Button variant="quiet" size="sm" onClick={() => toggle(tweak.id)}>
                  Accept
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
