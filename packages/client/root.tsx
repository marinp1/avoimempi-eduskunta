import { createRoot } from "react-dom/client";
import { App } from "./app";
import { HallituskausiProvider } from "./filters/HallituskausiContext";
import "./i18n";
import "./utils/d3-scale-shim";
import { ThemeProvider } from "./theme/ThemeContext";

document.addEventListener("DOMContentLoaded", () => {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <ThemeProvider>
      <HallituskausiProvider>
        <App />
      </HallituskausiProvider>
    </ThemeProvider>,
  );
});
