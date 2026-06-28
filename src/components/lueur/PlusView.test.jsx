import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlusView } from "./PlusView";

describe("PlusView", () => {
  it("shows a fallback when data is missing", () => {
    render(<PlusView data={null} history={[]} />);

    expect(screen.getByText(/données indisponibles/i)).toBeInTheDocument();
  });

  it("shows an empty state when there is no advanced content", () => {
    render(
      <PlusView
        data={{
          focus_date: "2026-06-27",
          vitals: {},
        }}
        history={[]}
      />,
    );

    expect(screen.getByText(/pas encore assez de données/i)).toBeInTheDocument();
    expect(screen.queryByText(/comparatif/i)).not.toBeInTheDocument();
  });

  it("renders compare panel when history is available", () => {
    render(
      <PlusView
        data={{
          focus_date: "2026-06-27",
          vitals: {},
        }}
        history={[{ date: "2026-06-27", recovery: 72, sleep: 80, strain: 12 }]}
      />,
    );

    expect(screen.getByText(/comparatif/i)).toBeInTheDocument();
    expect(screen.queryByText(/pas encore assez de données/i)).not.toBeInTheDocument();
  });
});
