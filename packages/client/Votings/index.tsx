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
import { useThemedColors } from "../theme/ThemeContext";

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
              borderRadius: 3,
              background: themedColors.backgroundPaper,
              border: `1px solid ${themedColors.dataBorder}`,
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            <CardContent sx={{ p: spacing.lg }}>
              <Typography
                variant="h4"
                component="h1"
                gutterBottom
                sx={{
                  color: colors.primary,
                  fontWeight: 700,
                  mb: spacing.md,
                  textAlign: "center",
                  letterSpacing: "-0.01em",
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
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      "&:hover": {
                        boxShadow: "0 2px 8px rgba(0, 53, 128, 0.12)",
                      },
                      "&.Mui-focused": {
                        boxShadow: "0 4px 12px rgba(0, 53, 128, 0.2)",
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
