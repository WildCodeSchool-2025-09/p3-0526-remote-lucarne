import { render, screen } from "@testing-library/react";

function TestComponent() {
  return <h1>Lucarne</h1>;
}

describe("front-end test environment", () => {
  it("renders a React component in jsdom", () => {
    render(<TestComponent />);

    expect(
      screen.getByRole("heading", { name: "Lucarne" }),
    ).toBeInTheDocument();
  });
});
