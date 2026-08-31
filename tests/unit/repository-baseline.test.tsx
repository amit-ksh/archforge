import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("repository baseline", () => {
  it("renders a safe unavailable state when IndexedDB is missing", async () => {
    render(<Home />);

    expect(
      await screen.findByRole("heading", {
        level: 3,
        name: "Workspace unavailable",
      }),
    ).toBeInTheDocument();
  });
});
