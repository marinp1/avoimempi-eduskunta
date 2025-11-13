import React from "react";
import { Box, CardContent, Typography, Fade } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import { GlassCard } from "../../theme/components";
import { spacing, gradients } from "../../theme";

export const AdminHeader: React.FC = () => {
  return (
    <Fade in timeout={400}>
      <Box>
        <GlassCard
          sx={{
            mb: spacing.md,
            background: gradients.primary,
            color: "white",
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.3)",
          }}
        >
          <CardContent sx={{ p: spacing.md }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
              <StorageIcon sx={{ fontSize: 40 }} />
              <Box>
                <Typography
                  variant="h4"
                  fontWeight="700"
                  letterSpacing="-0.5px"
                >
                  Admin Dashboard
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 0.5 }}>
                  Database scraping and parsing status
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </GlassCard>
      </Box>
    </Fade>
  );
};
