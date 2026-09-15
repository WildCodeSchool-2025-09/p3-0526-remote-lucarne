import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { ResourceActionsPopover } from "../../../src/ui/ResourceActionsPopover";

describe("ResourceActionsPopover", () => {
  it("renders native links and buttons and focuses the first action", async () => {
    const onDeactivate = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ResourceActionsPopover
          actions={[
            { href: "/resource/edit", key: "edit", label: "Modifier" },
            { key: "deactivate", label: "Désactiver", onSelect: onDeactivate },
          ]}
          triggerLabel="Ouvrir les actions de la ressource"
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Ouvrir les actions de la ressource" }));

    expect(screen.getByRole("group", { name: "Actions disponibles" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Modifier" })).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Désactiver" }));
    expect(onDeactivate).toHaveBeenCalledOnce();
    expect(screen.queryByRole("group", { name: "Actions disponibles" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ouvrir les actions de la ressource" })).toHaveFocus();
  });

  it("closes with Escape and restores focus to its trigger", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ResourceActionsPopover
          actions={[{ href: "/resource/edit", key: "edit", label: "Modifier" }]}
          triggerLabel="Ouvrir les actions de la ressource"
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "Ouvrir les actions de la ressource" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("group", { name: "Actions disponibles" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes when the user clicks outside", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <div>
          <ResourceActionsPopover
            actions={[{ href: "/resource/edit", key: "edit", label: "Modifier" }]}
            triggerLabel="Ouvrir les actions de la ressource"
          />
          <button type="button">En dehors</button>
        </div>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Ouvrir les actions de la ressource" }));
    await user.click(screen.getByRole("button", { name: "En dehors" }));

    expect(screen.queryByRole("group", { name: "Actions disponibles" })).not.toBeInTheDocument();
  });
});
