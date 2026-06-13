import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BirthdayFeature from "./BirthdayFeature";

describe("BirthdayFeature", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(async () => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("opens the card and shows the library immediately", async () => {
    render(<BirthdayFeature workspaceName="Personal" />);

    expect(screen.getByRole("button", { name: /open card/i })).toBeTruthy();
    expect(screen.getByRole("img", { name: /nicole on the opening card/i })).toBeTruthy();
    expect(screen.queryByText(/starts arabella on entry/i)).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: /photo library/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /open card/i }));

    expect(
      await screen.findByRole("heading", { level: 1, name: /happy birthday, nicole/i }),
    ).toBeTruthy();
    expect(screen.getByText(/short version:/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /linkedin orbit/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /behance renders/i })).toBeNull();
    expect(screen.getByRole("button", { name: /pause music/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /shuffle photos/i })).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2, name: /photo library/i })).toBeTruthy();
    expect(screen.queryAllByRole("textbox").length).toBe(0);
    expect(
      screen.getByText(/one of those frames that already feels like it belongs/i),
    ).toBeTruthy();

    const initialSources = Array.from(document.querySelectorAll(".nicole-library-card img")).map(
      (image) => image.getAttribute("src"),
    );

    fireEvent.click(screen.getByRole("button", { name: /shuffle photos/i }));

    const nextSources = Array.from(document.querySelectorAll(".nicole-library-card img")).map(
      (image) => image.getAttribute("src"),
    );

    expect(nextSources.every((src) => !initialSources.includes(src))).toBe(true);
  });
});
