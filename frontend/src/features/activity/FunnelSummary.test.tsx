import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FunnelSummary } from "./FunnelSummary";

describe("FunnelSummary", () => {
  const jobs = { inbox: 0, shortlist: 0, draft: 0, approved: 0, applied: 0, skipped: 0 };
  const zero = { scouted: 0, shortlisted: 0, skipped: 0, written: 0, writeSkipped: 0, jobs };

  it("shows a dash per stage when there is no data", () => {
    const { container } = render(<FunnelSummary funnel={zero} />);
    const cells = [...container.querySelectorAll(".funnel-stage__value")].map((el) => el.textContent);
    expect(cells).toEqual(["—", "—", "—", "—", "—"]);
  });

  it("shows real counts", () => {
    const { container } = render(<FunnelSummary funnel={{ ...zero, scouted: 4, shortlisted: 2 }} />);
    const cells = [...container.querySelectorAll(".funnel-stage__value")].map((el) => el.textContent);
    expect(cells).toEqual(["4", "2", "0", "0", "0"]);
  });
});
