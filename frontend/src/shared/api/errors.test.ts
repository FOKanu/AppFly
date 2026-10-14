import { describe, it, expect, afterEach, vi } from "vitest";
import { describeApiError } from "./errors";
import { apiPost } from "./client";

describe("describeApiError", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("classifies 502 upstream errors with backend detail", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({detail: "Gemini request failed (HTTP 503 UNAVAILABLE). Try again later."}), {status: 502, headers:{"Content-Type":"application/json"}})));

    const error = await apiPost("/jobs/x/letter/regenerate").catch((e) => e);
    const result = describeApiError(error, "Regenerating the letter");

    expect(result.kind).toBe("server");
    expect(result.message).toBe(
      "Regenerating the letter failed: Gemini request failed (HTTP 503 UNAVAILABLE). Try again later."
    );
  });

  it("redacts API keys in 502 details", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({detail: "Gemini rejected key AIzaSy" + "A".repeat(30) + " is invalid"}), {status: 502, headers:{"Content-Type":"application/json"}})));

    const error = await apiPost("/jobs/x/letter/regenerate").catch((e) => e);
    const result = describeApiError(error, "Regenerating the letter");

    expect(result.kind).toBe("server");
    expect(result.message).toContain("Regenerating the letter failed: Gemini rejected key");
    expect(result.message).not.toContain("AIza");
  });

  it("classifies 500 errors with generic message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({detail: "boom"}), {status: 500, headers:{"Content-Type":"application/json"}})));

    const error = await apiPost("/jobs/x/letter/regenerate").catch((e) => e);
    const result = describeApiError(error, "Regenerating the letter");

    expect(result.kind).toBe("server");
    expect(result.message).toBe(
      "Regenerating the letter failed: the API hit an internal error (HTTP 500). Check the terminal running the API, then try again."
    );
  });
});
