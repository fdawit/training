import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TrainingApp from "./TrainingApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TrainingApp />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js");
  });
}
