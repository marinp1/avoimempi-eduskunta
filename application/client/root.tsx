import React from "react";
import "./app.css";
import { createRoot } from "react-dom/client";
import { App } from "./app";

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(<App />);
});
