import { render } from "preact";
import "./index.css";
import App from "./app.jsx"; // fixed default import
import { PrimeReactProvider, PrimeReactContext } from "primereact/api";
import "primereact/resources/themes/lara-light-cyan/theme.css";
import 'primeicons/primeicons.css';

render(
  <PrimeReactProvider>
    <App />
  </PrimeReactProvider>,
  document.getElementById("app")
);
