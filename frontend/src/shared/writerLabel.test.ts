import { describe, expect, it } from "vitest";
import { UNKNOWN_WRITER, writerLabel } from "./writerLabel";

describe("writerLabel", () => {
  it("names the real model", () => {
    expect(writerLabel("gemini-x")).toBe("gemini-x");
    expect(writerLabel("  gemini-x ")).toBe("gemini-x");
  });

  it("falls back when the model is unknown", () => {
    expect(UNKNOWN_WRITER).toBe("Gemini (model unknown)");
    for (const value of [undefined, null, "", "   "]) {
      expect(writerLabel(value)).toBe(UNKNOWN_WRITER);
    }
  });
});
