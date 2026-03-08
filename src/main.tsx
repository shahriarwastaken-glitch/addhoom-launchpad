import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply theme on initial load (default: dark)
const storedTheme = localStorage.getItem('addhoom-theme');
if (storedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
}

createRoot(document.getElementById("root")!).render(<App />);
