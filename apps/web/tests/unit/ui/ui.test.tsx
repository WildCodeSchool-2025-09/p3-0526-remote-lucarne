import { fireEvent, render, screen } from "@testing-library/react";
import { Button } from "../../../src/ui/Button";
import { Checkbox } from "../../../src/ui/Checkbox";
import { EntityLogo } from "../../../src/ui/EntityLogo";
import { FormField } from "../../../src/ui/FormField";
import { Input } from "../../../src/ui/Input";

describe("Lucarne UI primitives", () => {
  it("renders a native disabled button and forwards its props", () => {
    const onClick = vi.fn();
    render(
      <Button aria-label="Save" disabled onClick={onClick} type="submit">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save" });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("type", "submit");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("forwards input accessibility state", () => {
    render(<Input aria-describedby="name-error" aria-invalid id="name" />);

    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-describedby", "name-error");
  });

  it("keeps checkbox native and interactive", () => {
    render(<Checkbox aria-label="Active" defaultChecked />);

    const checkbox = screen.getByRole("checkbox", { name: "Active" });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);

    expect(checkbox).not.toBeChecked();
  });

  it("associates a field label and accessible error message", () => {
    render(
      <FormField error="Le nom est obligatoire" htmlFor="name" label="Nom" required>
        <Input aria-describedby="name-error" id="name" />
      </FormField>,
    );

    expect(screen.getByLabelText("Nom *")).toHaveAttribute("id", "name");
    expect(screen.getByRole("alert")).toHaveTextContent("Le nom est obligatoire");
  });

  it("renders an entity logo or an accessible initial fallback", () => {
    const { rerender } = render(<EntityLogo logoUrl={null} name="Paris FC" />);

    expect(screen.getByLabelText("Initiale de Paris FC")).toHaveTextContent("P");

    rerender(<EntityLogo logoUrl="https://example.com/logo.png" name="Paris FC" />);
    expect(screen.getByAltText("Logo de Paris FC")).toHaveAttribute("src", "https://example.com/logo.png");
  });
});
