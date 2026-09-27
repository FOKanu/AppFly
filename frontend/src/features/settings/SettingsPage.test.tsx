import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsPage } from "./SettingsPage";

type Stored = { GEMINI_API_KEY: boolean; APIFY_TOKEN: boolean };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function settingsPayload(stored: Stored, leak?: Record<string, unknown>) {
  return {
    vault: {
      path: "~/Documents/Job Search",
      notes: "—",
      lastScout: "—",
      lastMatch: "—",
      lastWrite: "—",
    },
    connectivity: {
      localIpc: { status: "online" },
      remoteBridge: { status: "not_configured", url: "" },
    },
    health: {
      geminiFlash: { status: "missing" },
      ollama: { status: "unknown" },
      arbeitsagentur: { status: "unknown" },
      apify: { status: "unknown" },
      minilm: { status: "unknown" },
    },
    secrets: {
      GEMINI_API_KEY: stored.GEMINI_API_KEY,
      APIFY_TOKEN: stored.APIFY_TOKEN,
      ...leak,
    },
  };
}

describe("SettingsPage secrets", () => {
  const stored: Stored = { GEMINI_API_KEY: false, APIFY_TOKEN: false };
  let leak: Record<string, unknown> | undefined;

  beforeEach(() => {
    stored.GEMINI_API_KEY = false;
    stored.APIFY_TOKEN = false;
    leak = undefined;
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      const blob = args.map((arg) => String(arg)).join(" ");
      if (/secret-gemini|leaked-should-never|apify-live|last4/i.test(blob)) {
        throw new Error("connector secret leaked to console.log");
      }
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method ?? "GET").toUpperCase();
        if (url.endsWith("/settings") && method === "GET") {
          return jsonResponse(settingsPayload(stored, leak));
        }
        const secretMatch = url.match(/\/settings\/secrets\/([^/?]+)$/);
        if (secretMatch && method === "PUT") {
          const body = JSON.parse(String(init?.body ?? "{}")) as { value?: string };
          expect(body).toEqual({ value: expect.any(String) });
          expect(Object.keys(body)).toEqual(["value"]);
          const name = decodeURIComponent(secretMatch[1]);
          if (name === "gemini") stored.GEMINI_API_KEY = true;
          if (name === "apify") stored.APIFY_TOKEN = true;
          return jsonResponse({ configured: true });
        }
        if (url.endsWith("/settings") && method === "PUT") {
          return jsonResponse({ ok: true });
        }
        return jsonResponse({ error: "not found" }, 404);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );
  }

  it("saves a key with PUT { value }, then clears the password field", async () => {
    const user = userEvent.setup();
    renderPage();
    const gemini = await screen.findByLabelText("GEMINI_API_KEY");
    expect(gemini).toHaveAttribute("type", "password");
    expect(gemini).toHaveAttribute("autocomplete", "off");
    expect(screen.getAllByText("missing").length).toBeGreaterThan(0);

    await user.type(gemini, "secret-gemini-value-do-not-keep");
    const geminiForm = gemini.closest("form");
    expect(geminiForm).not.toBeNull();
    await user.click(within(geminiForm as HTMLFormElement).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(gemini).toHaveValue(""));
    expect(screen.queryByDisplayValue("secret-gemini-value-do-not-keep")).toBeNull();
    expect(document.body.textContent).not.toContain("secret-gemini-value-do-not-keep");
    await waitFor(() => expect(screen.getAllByText("configured").length).toBeGreaterThan(0));

    const calls = vi.mocked(fetch).mock.calls.filter((call) =>
      String(call[0]).includes("/settings/secrets/gemini"),
    );
    expect(calls[0]?.[1]).toMatchObject({
      method: "PUT",
      body: JSON.stringify({ value: "secret-gemini-value-do-not-keep" }),
    });
  });

  it("does not show a key after reload and ignores leaked GET secret strings", async () => {
    stored.GEMINI_API_KEY = true;
    leak = { GEMINI_API_KEY: "leaked-should-never-render", last4: "abcd" };
    renderPage();

    const gemini = await screen.findByLabelText("GEMINI_API_KEY");
    expect(gemini).toHaveValue("");
    expect(screen.getAllByText("configured").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain("leaked-should-never-render");
    expect(document.body.textContent).not.toContain("abcd");
    expect(screen.queryByText(/last-4/i)).toBeNull();
  });

  it("keeps Remote Bridge Connect disabled", async () => {
    renderPage();
    const connect = await screen.findByRole("button", { name: "Connect" });
    expect(connect).toBeDisabled();
    expect(screen.getAllByText(/not configured/).length).toBeGreaterThan(0);
  });
});
