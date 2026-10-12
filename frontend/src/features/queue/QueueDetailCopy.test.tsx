import { it, expect } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { QueueDetail } from "./QueueDetail";
import { JobRecord } from "./types";
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
  status: "pending",
  source: "test-source",
  lang: "en",
  url: "https://example.com",
  crawl_allowed: true,
};

// Test to verify the copy changes
it("should render Skip button instead of Deny", () => {
  const { queryByText } = render(
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

  expect(queryByText(/^Skip/)).toBeInTheDocument();
  expect(queryByText(/^Deny/)).not.toBeInTheDocument();
});

it("should render Record tab instead of Vault note", () => {
  const { queryByText } = render(
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

  expect(queryByText("Record")).toBeInTheDocument();
  expect(queryByText("Vault note")).not.toBeInTheDocument();
});

it("should show correct Record tab content", () => {
  const { queryByText } = render(
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
  const recordTab = queryByText("Record");
  if (recordTab) {
    fireEvent.click(recordTab);
  }

  expect(queryByText("Where this job lives")).toBeInTheDocument();

  // Find the specific element with class "mono-path" containing the source ID
  const monoPathElement = queryByText("ref test-source-id", { selector: "p.mono-path" });
  expect(monoPathElement).toBeInTheDocument();

  expect(
    queryByText(
      "This job lives in your local AppFly store. Approving or skipping changes its status there. Obsidian is only a one-time import; nothing is written back to a vault."
    )
  ).toBeInTheDocument();
  expect(queryByText("source of truth")).not.toBeInTheDocument();
});

it("should not show Companies/*.md path", () => {
  const { queryByText } = render(
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

  expect(queryByText(/Companies\/.*\.md/)).not.toBeInTheDocument();
});
