import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SystemCheck from "../../src/pages/SystemCheck.js";
import * as api from "../../src/api.js";

describe("SystemCheck (Lab 1, repointed per C-04)", () => {
  afterEach(() => vi.restoreAllMocks());

  // WORKED EXAMPLE — provided for you.
  it("renders the TokTickIT heading", () => {
    render(<SystemCheck />);
    expect(screen.getByText(/TokTickIT/i)).toBeInTheDocument();
  });

  // Issue 4 — the api module is mocked with vi.spyOn(api, "checkSystem") so these
  // two tests drive the success and error paths without touching the network.
  it("shows Online and the seeded categories on success", async () => {
    vi.spyOn(api, "checkSystem").mockResolvedValue({
      online: true,
      categories: [
        { id: 1, name: "Account and Access" },
        { id: 2, name: "Hardware" },
        { id: 3, name: "Software" },
        { id: 4, name: "Network" },
      ],
    });
    render(<SystemCheck />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));
    expect(await screen.findByText(/System Status: Online/i)).toBeInTheDocument();
    expect(screen.getByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
  });

  it("shows an Offline error message when the API is unavailable", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValue(new Error("boom"));
    render(<SystemCheck />);
    await userEvent.click(screen.getByRole("button", { name: /check system/i }));
    expect(await screen.findByText(/System Status: Offline/i)).toBeInTheDocument();
    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
