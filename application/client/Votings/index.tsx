import React, { Suspense } from "react";
// import "./VotingsPage.css";
import { VoteResults } from "./VoteResults";

const VotingsPage = () => {
  const [search, setSearch] = React.useState<string>("");
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

  return (
    <div>
      <input
        type="text"
        placeholder="hae äänestyksiä otsikolla"
        value={search}
        onInput={(ev) => {
          const val = (ev.target as HTMLInputElement).value ?? "";
          setSearch(val);
        }}
      />
      <div>
        <Suspense
          fallback={
            <div>
              <strong>Loading...</strong>
            </div>
          }
        >
          <div
            style={{
              opacity: isStale ? 0.5 : 1,
              transition: isStale
                ? "opacity 0.2s 0.2s linear"
                : "opacity 0s 0s linear",
            }}
          >
            <VoteResults query={deferredQuery} />
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default VotingsPage;
