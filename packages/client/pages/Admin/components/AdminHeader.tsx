import RefreshIcon from "@mui/icons-material/Refresh";
import StorageIcon from "@mui/icons-material/Storage";
import { Box, CardContent, Fade, IconButton, Typography } from "@mui/material";
import type React from "react";
import { gradients, spacing } from "#client/theme";
import { GlassCard } from "#client/theme/components";

type AdminHeaderProps = {
  onRefresh?: () => void;
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onRefresh }) => {
  return (
    <Fade in timeout={400}>
      <Box>
        <GlassCard
          sx={{
            mb: spacing.md,
            background: gradients.primary,
            color: "#FFFFFF",
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
          }}
        >
          <CardContent sx={{ p: spacing.md }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: spacing.sm }}
              >
                <StorageIcon sx={{ fontSize: 40, color: "#FFFFFF" }} />
                <Box>
                  <Typography
                    variant="h4"
                    fontWeight="700"
                    letterSpacing="-0.5px"
                    sx={{ color: "#FFFFFF" }}
                  >
                    Admin Dashboard
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{ opacity: 0.9, mt: 0.5, color: "#FFFFFF" }}
                  >
                    Database scraping and parsing status
                  </Typography>
                </Box>
              </Box>
              {onRefresh && (
                <IconButton
                  onClick={onRefresh}
                  sx={{
                    color: "#FFFFFF",
                    "&:hover": {
                      bgcolor: "rgba(255, 255, 255, 0.15)",
                    },
                  }}
                  title="Refresh status"
                >
                  <RefreshIcon />
                </IconButton>
              )}
            </Box>
          </CardContent>
        </GlassCard>
      </Box>
    </Fade>
  );
};
