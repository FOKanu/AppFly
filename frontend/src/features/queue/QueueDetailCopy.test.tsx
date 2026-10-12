import { describe, it, expect } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { QueueDetail } from "./QueueDetail";
import type { JobRecord } from "./types";
import { MemoryRouter } from "react-router-dom";

const mockJob: JobRecord = {
  source_id: "test-source-id",
  company: "Test Company",
  title: "Test Title",
  location: "Test Location",
  salary: "Test Salary",
  posted: "2023-01-01",
  description: "Test Description",
  letter_excerpt: "Test Letter Excerpt",
  score: 0.8,
  status: "draft",
  source: "test-source",
  lang: "en",
  url: "https://example.com",
  crawl_allowed: true,
};

describe("QueueDetail copy", () => {
  it("should render Skip button instead of Deny", () => {
    render(
      <MemoryRouter>
        <QueueDetail
          job={mockJob}
          position={1}
          total={10}
          onApprove={() => {}}
          onDeny={() => {}}
          onStep={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: /^Skip/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Deny/ })).not.toBeInTheDocument();
  });

  it("should render Record tab instead of Vault note", () => {
    render(
      <MemoryRouter>
        <QueueDetail
          job={mockJob}
          position={1}
          total={10}
          onApprove={() => {}}
          onDeny={() => {}}
          onStep={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole("tab", { name: "Record" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Vault note" })).not.toBeInTheDocument();
  });

  it("should show correct Record tab content", () => {
    render(
      <MemoryRouter>
        <QueueDetail
          job={mockJob}
          position={1}
          total={10}
          onApprove={() => {}}
          onDeny={() => {}}
          onStep={() => {}}
        />
      </MemoryRouter>
    );

    // Click the Record tab to make it active
    const recordTab = screen.getByRole("tab", { name: "Record" });
    fireEvent.click(recordTab);

    expect(screen.getByText("Where this job lives")).toBeInTheDocument();
    expect(screen.getByText("ref test-source-id", { selector: "p.mono-path" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "This job lives in your local AppFly store. Approving or skipping changes its status there. Obsidian is only a one-time import; nothing is written back to a vault."
      )
    ).toBeInTheDocument();
    expect(screen.queryByText(/source of truth/i)).not.toBeInTheDocument();
  });

  it("should not show Companies/*.md path", () => {
    render(
      <MemoryRouter>
        <QueueDetail
          job={mockJob}
          position={1}
          total={10}
          onApprove={() => {}}
          onDeny={() => {}}
          onStep={() => {}}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Companies\/.*\.md/)).not.toBeInTheDocument();
  });
});
