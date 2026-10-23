import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueueDetail } from "./QueueDetail";
import type { JobRecord } from "./types";

const baseJob: JobRecord = {
  source_id: "skip-source-id",
  company: "Acme",
  title: "Filtered Title",
  location: "Berlin",
  salary: "",
  posted: "2026-10-01",
  description: "Job description",
  letter_excerpt: "",
  score: 0.8,
  status: "draft",
  source: "test-source",
  lang: "en",
  url: "https://example.com",
  crawl_allowed: true,
};

function renderDetail(job: JobRecord) {
  render(
    <MemoryRouter>
      <QueueDetail
        job={job}
        position={1}
        total={10}
        onApprove={() => {}}
        onDeny={() => {}}
        onStep={() => {}}
      />
    </MemoryRouter>,
  );
}

describe("QueueDetail skip reason", () => {
  it("shows the filter reason instead of a score for a filtered job", () => {
    renderDetail({ ...baseJob, status: "skipped", score: null, skip_reason: "skip_company:Acme" });
    expect(screen.getByText("Filtered out: Acme is on your skip list")).toBeInTheDocument();
    expect(screen.getByText("Stopped at the hard filters, so it was never scored.")).toBeInTheDocument();
    expect(screen.queryByText("0.0")).toBeNull();
    expect(screen.queryByRole("meter", { name: "Overall match" })).toBeNull();
  });

  it("says not matched yet for an unscored job", () => {
    renderDetail({ ...baseJob, score: null });
    expect(screen.getByText("Not matched yet.")).toBeInTheDocument();
  });
});
