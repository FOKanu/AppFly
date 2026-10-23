import { describe, it, expect } from "vitest";
import { skipReasonText, isFiltered } from "./skipReason";

describe("skipReasonText", () => {
  it("formats skip_company reason", () => {
    expect(skipReasonText("skip_company:Acme")).toBe("Acme is on your skip list");
  });

  it("formats banned reason", () => {
    expect(skipReasonText("banned:crypto")).toBe("mentions “crypto”, a banned term");
  });

  it("formats missing reason", () => {
    expect(skipReasonText("missing:Python,Go")).toBe("missing must-have terms: Python, Go");
  });

  it("formats location reason", () => {
    expect(skipReasonText("location")).toBe("location is outside your areas");
  });

  it("formats salary reason", () => {
    expect(skipReasonText("salary:42000")).toBe("salary 42,000 is below your floor");
  });

  it("returns code for unrecognized reason", () => {
    expect(skipReasonText("weird_code")).toBe("weird_code");
  });
});

describe("isFiltered", () => {
  it("returns true when job is skipped with a skip reason", () => {
    expect(isFiltered({status:"skipped", skip_reason:"location"})).toBe(true);
  });

  it("returns false when job is skipped but has no skip reason", () => {
    expect(isFiltered({status:"skipped", skip_reason:null})).toBe(false);
  });

  it("returns false when job is skipped but skip_reason is undefined", () => {
    expect(isFiltered({status:"skipped"})).toBe(false);
  });

  it("returns false when job is not skipped", () => {
    expect(isFiltered({status:"draft", skip_reason:"location"})).toBe(false);
  });
});
