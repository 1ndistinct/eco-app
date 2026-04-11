import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it.skip("renders the first product slice", () => {
    render(<App />);
    expect(screen.getByText(/TODO: define the first product slice here./i)).toBeTruthy();
  });
});
