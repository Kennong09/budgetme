import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders BudgetMe app", () => {
  render(<App />);
  const loadingText = screen.getByText(/BudgetMe/i);
  expect(loadingText).toBeInTheDocument();
});
