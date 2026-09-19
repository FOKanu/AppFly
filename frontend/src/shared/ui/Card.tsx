import type { ReactNode } from "react";

interface CardProps {
  /** Uppercase mono line above the title, e.g. "LAST 30 DAYS". */
  kicker?: ReactNode;
  title?: ReactNode;
  /** Right-aligned meta on the header row. */
  aside?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}

/**
 * Purpose: The panel shape every desktop screen composes from — kicker, title,
 *          optional right-hand meta, then body.
 * Does not: fetch anything or decide its own width; callers place it on a grid.
 */
export function Card({ kicker, title, aside, className, bodyClassName, children }: CardProps) {
  const classes = ["card", className].filter(Boolean).join(" ");
  const bodyClasses = ["card__body", bodyClassName].filter(Boolean).join(" ");
  const hasHead = kicker !== undefined || title !== undefined || aside !== undefined;

  return (
    <section className={classes}>
      {hasHead ? (
        <header className="card__head">
          <div>
            {kicker ? <p className="card__kicker">{kicker}</p> : null}
            {title ? <h2 className="card__title">{title}</h2> : null}
          </div>
          {aside ? <div className="card__aside">{aside}</div> : null}
        </header>
      ) : null}
      <div className={bodyClasses}>{children}</div>
    </section>
  );
}
