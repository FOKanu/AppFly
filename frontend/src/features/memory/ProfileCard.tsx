import type { ReactNode } from "react";

type Stat = {
  label: string;
  value: string | number;
};

type ProfileCardProps = {
  title: string;
  path: string;
  exists: boolean;
  stats: Stat[];
  chips?: string[];
  note?: string;
  children?: ReactNode;
};

/**
 * Purpose: Read-only vault file / profile slice (path, counts, chips).
 * Does not: edit notes, dump CV body, or show connector keys.
 */
export function ProfileCard({
  title,
  path,
  exists,
  stats,
  chips = [],
  note,
  children,
}: ProfileCardProps) {
  return (
    <article className="card">
      <div className="card-head">
        <h2>{title}</h2>
        <span className={exists ? "badge badge-ok" : "badge"}>{exists ? "Present" : "Missing"}</span>
      </div>
      <p className="path">{path}</p>
      {stats.length > 0 ? (
        <dl className="meta">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt>{stat.label}</dt>
              <dd>{stat.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {chips.length > 0 ? (
        <div className="chips">
          {chips.map((chip) => (
            <span className="chip" key={chip}>
              {chip}
            </span>
          ))}
        </div>
      ) : null}
      {note ? <p className="note">{note}</p> : null}
      {children}
    </article>
  );
}
