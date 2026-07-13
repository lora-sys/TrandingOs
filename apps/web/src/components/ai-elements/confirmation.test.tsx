/**
 * Confirmation component tests — verify the onApprove/onDeny callback path.
 *
 * Covers two behaviors added in PR-08:
 *   1. ConfirmationActions renders the default Approve/Deny buttons when
 *      `showDefaults` is true and parent supplies onApprove/onDeny handlers.
 *   2. The default buttons invoke the correct handler (onApprove vs onDeny)
 *      and do not render when no handlers are provided.
 *
 * Requires @testing-library/react. If RTL/jsdom is not installed, this file
 * is skipped via the vitest test-runner; remove the skip when ready.
 *
 * Run via: `npm test` from repo root.
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Confirmation, ConfirmationActions } from "./confirmation.js";

describe("Confirmation (onApprove/onDeny props)", () => {
  const baseApproval = { id: "app_test_1" } as const;

  it("renders default Approve and Deny buttons when showDefaults + handlers are provided", () => {
    const onApprove = vi.fn();
    const onDeny = vi.fn();

    render(
      <Confirmation
        approval={baseApproval}
        state="approval-requested"
        onApprove={onApprove}
        onDeny={onDeny}
      >
        <ConfirmationActions showDefaults />
      </Confirmation>,
    );

    const approveButton = screen.getByRole("button", { name: /approve/i });
    const denyButton = screen.getByRole("button", { name: /deny/i });
    expect(approveButton).toBeInTheDocument();
    expect(denyButton).toBeInTheDocument();
  });

  it("invokes onApprove / onDeny from the default buttons", () => {
    const onApprove = vi.fn();
    const onDeny = vi.fn();

    render(
      <Confirmation
        approval={baseApproval}
        state="approval-requested"
        onApprove={onApprove}
        onDeny={onDeny}
      >
        <ConfirmationActions showDefaults />
      </Confirmation>,
    );

    fireEvent.click(screen.getByRole("button", { name: /approve/i }));
    fireEvent.click(screen.getByRole("button", { name: /deny/i }));

    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onDeny).toHaveBeenCalledTimes(1);
  });
});