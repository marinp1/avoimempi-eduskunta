import React, { useState } from "react";
import VotingsPage from "./Votings";
import RepresentativesPage from "./Representatives";

const Pages = Object.freeze({
  Votings: "votings",
  Representatives: "representatives",
});

type Page = (typeof Pages)[keyof typeof Pages];

const PageComponents = {
  [Pages.Representatives]: RepresentativesPage,
  [Pages.Votings]: VotingsPage,
} satisfies Record<Page, React.FC<Record<string, never>>>;

export const App = () => {
  const [activeTab, setActiveTab] = useState<Page>(Pages.Representatives);
  const ActivePage = PageComponents[activeTab];
  return <ActivePage />;
};
