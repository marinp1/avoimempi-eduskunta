// VotingsPage.tsx
import React, { Suspense } from "react";
import { TextField, Box, CircularProgress } from "@mui/material";
import { VoteResults } from "./VoteResults";

const VotingsPage = () => {
  const [search, setSearch] = React.useState<string>("");
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ mb: 2, maxWidth: 400 }}>
        <TextField
          fullWidth
          label="Hae äänestyksiä otsikolla"
          value={search}
          onChange={(ev) => setSearch(ev.target.value ?? "")}
        />
      </Box>

      <Suspense
        fallback={
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress />
          </Box>
        }
      >
        <Box
          sx={{
            opacity: isStale ? 0.5 : 1,
            transition: isStale
              ? "opacity 0.2s 0.2s linear"
              : "opacity 0s 0s linear",
          }}
        >
          <VoteResults query={deferredQuery} />
        </Box>
      </Suspense>
    </Box>
  );
};

export default VotingsPage;
