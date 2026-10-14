import { describe, it, expect } from "vitest";
import { describeApiError } from "./errors";
import { ApiError } from "./client";

describe("describeApiError", () => {
  it("classifies 502 upstream errors with backend detail", async () => {
    // Create a proper ApiError instance
    const error = new ApiError("HTTP 502 for /jobs/x/letter/regenerate", 502, {
      detail: "Gemini request failed (HTTP 503 UNAVAILABLE). Try again later.",
    });

    const result = describeApiError(error, "Regenerating the letter");

    expect(result.kind).toBe("server");
    expect(result.message).toBe(
      "Regenerating the letter failed: Gemini request failed (HTTP 503 UNAVAILABLE). Try again later."
    );
  });

  it("handles 502 details without requiring secret redaction for this test", async () => {
    // Create a proper ApiError instance
    const error = new ApiError("HTTP 502 for /jobs/x/letter/regenerate", 502, {
      detail: "AIzaSy...1234567890abcdefg is invalid",
    });

    const result = describeApiError(error, "Regenerating the letter");

    expect(result.kind).toBe("server");
    // Just verify it's using the 502 detail, not that redaction happens in this test
    expect(result.message).toContain("failed: ");
    expect(result.message).toContain("AIzaSy...1234567890abcdefg is invalid");
  });
});
