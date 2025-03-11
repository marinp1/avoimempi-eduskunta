import React, { useState } from "react";
import AboutPage from "./AboutPage.js";
import ContactPage from "./ContactPage.js";
import RepresentativesPage from "./RepresentativesPage.js";

export const App = () => {
  const [activeTab, setActiveTab] = useState("representatives");

  return (
    <div className="app">
      <nav className="tab-bar">
        <ul>
          <li>
            <button onClick={() => setActiveTab("representatives")}>
              Representatives
            </button>
          </li>
          <li>
            <button onClick={() => setActiveTab("about")}>About</button>
          </li>
          <li>
            <button onClick={() => setActiveTab("contact")}>Contact</button>
          </li>
        </ul>
      </nav>
      <div className="content">
        {activeTab === "representatives" && <RepresentativesPage />}
        {activeTab === "about" && <AboutPage />}
        {activeTab === "contact" && <ContactPage />}
      </div>
    </div>
  );
};
