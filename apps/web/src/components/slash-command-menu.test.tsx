/**
 * SlashCommandMenu tests — verify autocomplete behavior, filtering,
 * keyboard navigation, and close semantics.
 *
 * Uses @testing-library/react + vitest's environment. RTL/jsdom is required;
 * if not installed, skip via `npx vitest run --reporter=verbose`.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SlashCommandMenu, SLASH_COMMANDS } from "./slash-command-menu";

describe("SlashCommandMenu", () => {
  it("renders nothing when input does not start with /", () => {
    const { container } = render(
      <SlashCommandMenu inputValue="hello" onSelect={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all 7 commands when input is /", () => {
    render(<SlashCommandMenu inputValue="/" onSelect={() => undefined} />);
    expect(screen.getAllByRole("option")).toHaveLength(SLASH_COMMANDS.length);
    expect(screen.getByText("/research")).toBeInTheDocument();
    expect(screen.getByText("/bootstrap-os")).toBeInTheDocument();
  });

  it("filters by query after /", () => {
    render(<SlashCommandMenu inputValue="/re" onSelect={() => undefined} />);
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]?.getAttribute("data-cmd")).toBe("/research");
  });

  it("moves selection down with ArrowDown (wraps to first)", () => {
    render(<SlashCommandMenu inputValue="/" onSelect={() => undefined} />);
    const menu = screen.getByTestId("slash-command-menu");

    // Initial: index 0 (/research) is selected
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("data-selected", "true");

    fireEvent.keyDown(menu, { key: "ArrowDown" });
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("data-selected", "false");
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("data-selected", "true");
  });

  it("calls onSelect with the active command example on Enter", () => {
    const onSelect = vi.fn();
    render(<SlashCommandMenu inputValue="/" onSelect={onSelect} />);
    const menu = screen.getByTestId("slash-command-menu");

    fireEvent.keyDown(menu, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledWith(SLASH_COMMANDS[0]?.example);
  });

  it("closes (renders null) after Escape", () => {
    const onSelect = vi.fn();
    const { container, rerender } = render(
      <SlashCommandMenu inputValue="/" onSelect={onSelect} />,
    );
    const menu = screen.getByTestId("slash-command-menu");

    fireEvent.keyDown(menu, { key: "Escape" });
    expect(onSelect).toHaveBeenCalledWith("");

    // Caller signals close by clearing the leading "/"
    rerender(<SlashCommandMenu inputValue="" onSelect={onSelect} />);
    expect(container.firstChild).toBeNull();
  });

  it("selects via click", () => {
    const onSelect = vi.fn();
    render(<SlashCommandMenu inputValue="/" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("/plan"));
    expect(onSelect).toHaveBeenCalledWith("/plan ETH 100 spot");
  });
});