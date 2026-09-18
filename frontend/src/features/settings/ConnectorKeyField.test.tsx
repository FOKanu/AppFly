import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConnectorKeyField } from "./ConnectorKeyField";

describe("ConnectorKeyField", () => {
  it("never seeds the input from a configured flag and clears after save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn(async () => undefined);
    const { rerender } = render(
      <ConnectorKeyField name="APIFY_TOKEN" configured={false} onSave={onSave} />,
    );

    const input = screen.getByLabelText("APIFY_TOKEN");
    expect(input).toHaveAttribute("type", "password");
    expect(input).toHaveValue("");
    expect(screen.getByText("missing")).toBeInTheDocument();

    await user.type(input, "apify-live-token");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith("apify-live-token");
    expect(input).toHaveValue("");

    rerender(<ConnectorKeyField name="APIFY_TOKEN" configured onSave={onSave} />);
    expect(screen.getByLabelText("APIFY_TOKEN")).toHaveValue("");
    expect(screen.getByText("configured")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotate" })).toBeDisabled();
    expect(document.body.textContent).not.toContain("apify-live-token");
  });
});
