import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { EmptyQueueState } from "./EmptyQueueState";

describe("EmptyQueueState", () => {
  it("lists every banned brand as one English list, Wellfound included", () => {
    render(<EmptyQueueState />);
    expect(
      screen.getByText(
        "LinkedIn, Indeed, Stepstone, ZipRecruiter, Xing, Glassdoor, and Wellfound (AngelList) never enter through crawl or Apify.",
      ),
    ).toBeInTheDocument();
  });
});
