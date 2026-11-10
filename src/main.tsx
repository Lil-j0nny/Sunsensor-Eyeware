import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./staff.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

if (
  root.dataset.ssr === "1" &&
  root.dataset.ssrPath === window.location.pathname
) {
  hydrateRoot(root, <App initialPath={window.location.pathname} />);
} else {
  createRoot(root).render(
    <React.StrictMode>
      <App initialPath={window.location.pathname} />
    </React.StrictMode>,
  );
}
