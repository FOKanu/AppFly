import { describe, expect, it } from "vitest";
import { configuredFlag, parseSettings } from "./settingsApi";

describe("parseSettings", () => {
  it("copies configured booleans and never stores leaked key strings", () => {
    const view = parseSettings(
      {
        secrets: {
          GEMINI_API_KEY: "super-secret-gemini",
          APIFY_TOKEN: { configured: true, value: "apify-should-vanish", last4: "wxyz" },
        },
      },
      true,
    );
    expect(view.secrets.GEMINI_API_KEY).toBe(true);
    expect(view.secrets.APIFY_TOKEN).toBe(true);
    expect(JSON.stringify(view)).not.toContain("super-secret-gemini");
    expect(JSON.stringify(view)).not.toContain("apify-should-vanish");
    expect(JSON.stringify(view)).not.toContain("wxyz");
  });

  it("marks IPC offline when the local API is unreachable", () => {
    const view = parseSettings(null, false);
    expect(view.connectivity.localIpc.status).toBe("offline");
    expect(view.connectivity.remoteBridge.status).toBe("not_configured");
    expect(view.secrets.GEMINI_API_KEY).toBe(false);
  });

  it("downgrades a claimed-online Remote Bridge to offline in Phase 1", () => {
    const view = parseSettings(
      {
        connectivity: {
          remoteBridge: { status: "online", url: "https://bridge.example.invalid" },
        },
      },
      true,
    );
    expect(view.connectivity.remoteBridge.status).toBe("offline");
    expect(view.connectivity.remoteBridge.url).toBe("https://bridge.example.invalid");
  });
});

describe("configuredFlag", () => {
  it("treats a leaked string as configured without returning the string", () => {
    expect(configuredFlag("")).toBe(false);
    expect(configuredFlag("nope")).toBe(true);
    expect(configuredFlag(true)).toBe(true);
    expect(configuredFlag({ configured: false, value: "x" })).toBe(false);
  });
});
