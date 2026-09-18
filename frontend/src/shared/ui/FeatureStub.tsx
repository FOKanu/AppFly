import type { CSSProperties } from "react";
import { tokens } from "./tokens";

type FeatureStubProps = {
  title: string;
  detail?: string;
};

/**
 * Purpose: Placeholder panel other agents can import before a real screen exists.
 * Inputs: `title` and optional `detail` copy.
 * Returns: A simple raised panel using shared tokens.
 * Does not: Fetch jobs, route, or call the API.
 */
export function FeatureStub({ title, detail }: FeatureStubProps) {
  const style: CSSProperties = {
    margin: "1.5rem",
    padding: "1.25rem 1.5rem",
    maxWidth: "40rem",
    background: tokens.color.panel,
    border: `1px solid ${tokens.color.border}`,
    borderRadius: 8,
    color: tokens.color.text,
    fontFamily: tokens.font.sans,
  };

  return (
    <section style={style}>
      <p
        style={{
          margin: 0,
          fontSize: "0.7rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: tokens.color.accent,
        }}
      >
        Jobhunt Copilot
      </p>
      <h1 style={{ margin: "0.4rem 0 0", fontSize: "1.15rem", fontWeight: 600 }}>
        {title}
      </h1>
      {detail ? (
        <p
          style={{
            margin: "0.55rem 0 0",
            color: tokens.color.textMuted,
            fontSize: "0.875rem",
            lineHeight: 1.45,
          }}
        >
          {detail}
        </p>
      ) : null}
    </section>
  );
}
