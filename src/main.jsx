import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// CSS imports - order matters!
import "./styles.css";                          // Base styles
import "./styles/global.css";                   // Global utilities
import "./styles/components/animations.css";     // Animations
import "./styles/components/buttons.css";        // Button components
import "./styles/components/cards.css";          // Card components
import "./styles/components/forms.css";          // Form controls
import "./styles/components/panels.css";         // Panel components
import "./styles/pages/header.css";              // Header
import "./styles/pages/welcome.css";             // Welcome screen
import "./styles/pages/deck-grid.css";           // Vocabulary deck grid
import "./styles/pages/learn.css";               // Learn/Blitz/Challenge modes
import "./styles/pages/stories.css";             // Stories mode
import "./styles/pages/import.css";              // Import views
import "./styles/pages/settings.css";            // Settings page

import App from "../App.jsx";

const root = createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
