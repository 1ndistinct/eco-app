import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import BirthdayFeature from "./BirthdayFeature";

describe("BirthdayFeature", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the birthday hero, links, and Behance section", () => {
    render(<BirthdayFeature workspaceName="Personal" />);

    expect(screen.getByRole("heading", { level: 1, name: /happy birthday, nicole/i })).toBeTruthy();
    expect(screen.getByText(/mounted inside personal/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /linkedin orbit/i }).getAttribute("href")).toBe(
      "https://uk.linkedin.com/in/thenicoleborman",
    );
    expect(screen.getByRole("link", { name: /behance renders/i }).getAttribute("href")).toBe(
      "https://www.behance.net/nborman",
    );
    expect(
      screen.getByRole("heading", { level: 2, name: /some of the fun 3d work too/i }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /tiny plane/i })).toBeTruthy();
  });
});
