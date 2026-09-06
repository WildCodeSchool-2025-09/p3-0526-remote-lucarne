import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "./lib/queryClient";
import { RouterProvider } from "react-router";
import router from "./router";
import "./styles/global.css";



const rootElement = document.getElementById("root");

if (rootElement == null) {
  throw new Error('The document must contain an element with the id "root".');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
