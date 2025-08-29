import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders BudgetMe app", () => {
  render(<App />);
  const logoText = screen.getByText("BudgetMe", { selector: ".logo-text-hero" });
  expect(logoText).toBeInTheDocument();
});