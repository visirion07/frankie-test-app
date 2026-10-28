import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles.css";
import "@frankieai/react/styles.css";
import { App } from "./App";
import { worker } from "./mocks/browser";

// Mocks run in every build on purpose: this app exists to test Frankie against a
// predictable API. Unmatched requests (Frankie's cloud, /api/frankie/*) go to the network.
await worker.start({ onUnhandledFrame: "bypass", quiet: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
