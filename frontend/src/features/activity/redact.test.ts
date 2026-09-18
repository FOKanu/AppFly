import { describe, expect, it } from "vitest";
import { redactError, redactSecrets } from "./redact";

describe("redactSecrets", () => {
  it("strips Google API keys and env assignments", () => {
    const raw =
      "write failed GEMINI_API_KEY=AIzaSyFakeSecretThatMustNeverRender012345 Bearer abc.def.ghi";
    const out = redactSecrets(raw);
    expect(out).not.toMatch(/AIza/);
    expect(out).not.toMatch(/abc\.def\.ghi/);
    expect(out).toContain("[redacted]");
  });

  it("strips JSON secret fields", () => {
    const out = redactSecrets('{"gemini_api_key":"super-secret-value","model":"flash"}');
    expect(out).not.toContain("super-secret-value");
    expect(out).toContain("[redacted]");
  });
});

describe("redactError", () => {
  it("reads message objects", () => {
    const out = redactError({ message: "JOBSUCHE_API_KEY=secret-client-id-value" });
    expect(out).not.toContain("secret-client-id-value");
    expect(out).toContain("[redacted]");
  });
});
