import { createRoot } from "react-dom/client";
import { App } from "./app";
import "./i18n";
import { ThemeProvider } from "./theme/ThemeContext";

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
});
