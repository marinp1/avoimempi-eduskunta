// VotingsPage.tsx
import React, { Suspense } from "react";
import {
  TextField,
  Box,
  CircularProgress,
  Card,
  CardContent,
  Typography,
  InputAdornment,
  Fade,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { VoteResults } from "./VoteResults";

const VotingsPage = () => {
  const [search, setSearch] = React.useState<string>("");
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

  return (
    <Box>
      {/* Search Header Card */}
      <Fade in timeout={500}>
        <Card
          elevation={0}
          sx={{
            mb: 4,
            borderRadius: 3,
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h4"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 700,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                mb: 3,
                textAlign: "center",
              }}
            >
              Eduskunnan äänestykset
            </Typography>
            <Box sx={{ maxWidth: 600, mx: "auto" }}>
              <TextField
                fullWidth
                label="Hae äänestyksiä otsikolla"
                value={search}
                onChange={(ev) => setSearch(ev.target.value ?? "")}
                placeholder="Kirjoita vähintään 3 merkkiä..."
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: "#667eea" }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 3,
                    background: "rgba(255,255,255,0.7)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      background: "rgba(255,255,255,0.9)",
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.15)",
                    },
                    "&.Mui-focused": {
                      background: "rgba(255,255,255,1)",
                      boxShadow: "0 4px 16px rgba(102, 126, 234, 0.25)",
                    },
                  },
                }}
              />
            </Box>
          </CardContent>
        </Card>
      </Fade>

      <Suspense
        fallback={
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: "#667eea" }} />
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
