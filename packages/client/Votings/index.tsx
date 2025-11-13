// VotingsPage.tsx
import React, { Suspense } from "react";
import {
  TextField,
  Box,
  CircularProgress,
  CardContent,
  Typography,
  InputAdornment,
  Fade,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { VoteResults } from "./VoteResults";
import { GlassCard } from "../theme/components";
import { commonStyles, colors, spacing } from "../theme";

const VotingsPage = () => {
  const [search, setSearch] = React.useState<string>("");
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

  return (
    <Box>
      {/* Search Header Card */}
      <Fade in timeout={500}>
        <Box>
          <GlassCard sx={{ mb: spacing.lg }}>
            <CardContent sx={{ p: spacing.lg }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  ...commonStyles.gradientText,
                  mb: spacing.md,
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
                        <SearchIcon sx={{ color: colors.primary }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    ...commonStyles.styledTextField,
                    "& .MuiOutlinedInput-root": {
                      ...commonStyles.styledTextField[
                        "& .MuiOutlinedInput-root"
                      ],
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
          </GlassCard>
        </Box>
      </Fade>

      <Suspense
        fallback={
          <Box sx={{ ...commonStyles.centeredFlex, py: spacing.xl }}>
            <CircularProgress sx={{ color: colors.primary }} />
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
