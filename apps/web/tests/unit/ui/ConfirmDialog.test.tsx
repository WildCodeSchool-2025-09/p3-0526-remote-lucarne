import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "../../../src/ui/ConfirmDialog";

describe("ConfirmDialog", () => {
  it("moves focus into the dialog, traps it and restores it on close", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <>
        <button type="button">Déclencheur</button>
        <ConfirmDialog onCancel={onCancel} onConfirm={vi.fn()} open={false} title="Confirmer l’action ?" />
      </>,
    );

    const trigger = screen.getByRole("button", { name: "Déclencheur" });
    trigger.focus();
    rerender(
      <>
        <button type="button">Déclencheur</button>
        <ConfirmDialog onCancel={onCancel} onConfirm={vi.fn()} open title="Confirmer l’action ?" />
      </>,
    );

    const confirm = screen.getByRole("button", { name: "Confirmer" });
    const cancel = screen.getByRole("button", { name: "Annuler" });
    expect(confirm).toHaveFocus();

    await user.tab();
    expect(cancel).toHaveFocus();

    rerender(
      <>
        <button type="button">Déclencheur</button>
        <ConfirmDialog onCancel={onCancel} onConfirm={vi.fn()} open={false} title="Confirmer l’action ?" />
      </>,
    );
    expect(trigger).toHaveFocus();
  });

  it("closes with Escape when no action is pending", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog onCancel={onCancel} onConfirm={vi.fn()} open title="Confirmer l’action ?" />);

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledOnce();
  });
});
