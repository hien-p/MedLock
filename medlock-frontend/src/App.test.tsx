import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";

test("renders landing page hero text", () => {
  const queryClient = new QueryClient();
  render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>,
  );
  const heroBadge = screen.getByRole("heading", {
    level: 2,
    name: /A Privacy-Preserving AI Workflow/i,
  });
  expect(heroBadge).toBeInTheDocument();
});
