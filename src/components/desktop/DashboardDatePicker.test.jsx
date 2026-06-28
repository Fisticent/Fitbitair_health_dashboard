import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DashboardDatePicker } from "./DashboardDatePicker";

describe("DashboardDatePicker", () => {
  it("renders the trigger with the selected date", () => {
    render(
      <DashboardDatePicker
        value="2026-06-15"
        onChange={() => {}}
        today="2026-06-27"
        datesWithData={["2026-06-15"]}
      />,
    );

    expect(screen.getByRole("button", { name: /15 juin 2026/i })).toBeInTheDocument();
  });

  it("opens the dialog and exposes aria attributes", async () => {
    render(
      <DashboardDatePicker
        value="2026-06-15"
        onChange={() => {}}
        today="2026-06-27"
      />,
    );

    const trigger = screen.getByRole("button", { name: /15 juin 2026/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");

    const dialog = await screen.findByRole("dialog", { name: /choisir une date/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    render(
      <DashboardDatePicker
        value="2026-06-15"
        onChange={() => {}}
        today="2026-06-27"
      />,
    );

    const trigger = screen.getByRole("button", { name: /15 juin 2026/i });
    fireEvent.click(trigger);
    await screen.findByRole("dialog");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
    expect(document.activeElement).toBe(trigger);
  });

  it("calls onChange when a day is selected", async () => {
    const onChange = vi.fn();

    render(
      <DashboardDatePicker
        value="2026-06-15"
        onChange={onChange}
        today="2026-06-27"
        datesWithData={["2026-06-10", "2026-06-15"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /15 juin 2026/i }));
    await screen.findByRole("dialog");

    const dayButtons = screen.getAllByRole("button").filter((btn) => btn.textContent === "10");
    fireEvent.click(dayButtons[0]);

    expect(onChange).toHaveBeenCalledWith("2026-06-10");
  });

  it("does not allow selecting dates outside the 90-day window", async () => {
    render(
      <DashboardDatePicker
        value="2026-06-27"
        onChange={() => {}}
        today="2026-06-27"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /27 juin 2026/i }));
    await screen.findByRole("dialog");

    const prevMonth = screen.getByRole("button", { name: /previous month/i });
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(prevMonth);
    }

    const oldDay = screen.getByRole("button", { name: "dimanche 1 février 2026" });
    expect(oldDay).toBeDisabled();
  });
});
