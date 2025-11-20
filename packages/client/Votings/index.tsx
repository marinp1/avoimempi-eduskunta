// VotingsPage.tsx

import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  CardContent,
  CircularProgress,
  Fade,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";
import React, { Suspense } from "react";
import { colors, commonStyles, spacing } from "../theme";
import { useThemedColors } from "../theme/ThemeContext";
import { VoteResults } from "./VoteResults";

const VotingsPage = () => {
  const themedColors = useThemedColors();
  const [search, setSearch] = React.useState<string>("");
  const deferredQuery = React.useDeferredValue(search);
  const isStale = search !== deferredQuery;

  return (
    <Box>
      {/* Search Header Card */}
      <Fade in timeout={500}>
        <Box>
          <Box
            sx={{
              mb: spacing.lg,
              borderRadius: 1,
              background: themedColors.backgroundPaper,
              border: `1px solid ${themedColors.dataBorder}`,
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)",
            }}
          >
            <CardContent sx={{ p: spacing.lg }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  color: colors.primary,
                  fontWeight: 600,
                  mb: spacing.md,
                  textAlign: "center",
                  letterSpacing: "0",
                }}
              >
                Eduskunnan äänestykset
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  mb: spacing.md,
                  textAlign: "center",
                  maxWidth: 600,
                  mx: "auto",
                }}
              >
                Etsi ja selaa eduskunnan äänestystietoja
              </Typography>
              <Box sx={{ maxWidth: 700, mx: "auto" }}>
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
                    "& .MuiOutlinedInput-root": {
                      background: themedColors.backgroundPaper,
                      transition: "all 0.2s ease-in-out",
                      "&:hover": {
                        boxShadow: "0 1px 3px rgba(0, 53, 128, 0.15)",
                      },
                      "&.Mui-focused": {
                        boxShadow: "0 2px 6px rgba(0, 53, 128, 0.2)",
                      },
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Box>
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
