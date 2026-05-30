import * as React from "react";
import { createRoot } from "react-dom/client";
import { CO2Calculator } from "./App";
import "./index.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <CO2Calculator />
  </React.StrictMode>
);
