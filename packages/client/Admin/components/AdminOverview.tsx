import React from "react";
import { Box, CardContent, Typography, Fade } from "@mui/material";
import { GlassCard } from "../../theme/components";
import { spacing, colors, gradients, commonStyles } from "../../theme";

type ScrapingOverview = {
  total_tables: number;
  tables_with_data: number;
  tables_completed: number;
  total_api_rows: number;
  total_scraped_rows: number;
  overall_progress_percent: number;
  tables_with_parsed_data: number;
  tables_fully_parsed: number;
  total_parsed_rows: number;
};

interface AdminOverviewProps {
  overview: ScrapingOverview | null;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({ overview }) => {
  if (!overview) return null;

  return (
    <Fade in timeout={500}>
      <Box sx={{ mb: spacing.md }}>
        <Typography variant="h6" fontWeight="600" sx={{ mb: spacing.sm }}>
          Overview
        </Typography>
        <Box sx={commonStyles.responsiveGrid(250)}>
          {/* Overall Progress */}
          <GlassCard
            sx={{
              background: gradients.primary,
              color: "white",
            }}
          >
            <CardContent sx={{ p: spacing.md }}>
              <Typography variant="h3" fontWeight="700" sx={{ mb: 1 }}>
                {overview.overall_progress_percent.toFixed(1)}%
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Overall Progress
              </Typography>
              <Typography
                variant="caption"
                sx={{ opacity: 0.8, mt: 1, display: "block" }}
              >
                {overview.total_scraped_rows.toLocaleString()} /{" "}
                {overview.total_api_rows.toLocaleString()} rows
              </Typography>
            </CardContent>
          </GlassCard>

          {/* Tables with Data */}
          <GlassCard>
            <CardContent sx={{ p: spacing.md }}>
              <Typography
                variant="h3"
                fontWeight="700"
                sx={{ mb: 1, color: colors.primary }}
              >
                {overview.tables_with_data}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tables with Data
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                out of {overview.total_tables} total
              </Typography>
            </CardContent>
          </GlassCard>

          {/* Completed Tables */}
          <GlassCard>
            <CardContent sx={{ p: spacing.md }}>
              <Typography
                variant="h3"
                fontWeight="700"
                sx={{ mb: 1, color: colors.success }}
              >
                {overview.tables_completed}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Completed Tables
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                100% scraped
              </Typography>
            </CardContent>
          </GlassCard>

          {/* Parsed Tables */}
          <GlassCard>
            <CardContent sx={{ p: spacing.md }}>
              <Typography
                variant="h3"
                fontWeight="700"
                sx={{ mb: 1, color: colors.info }}
              >
                {overview.tables_with_parsed_data}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tables Parsed
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: "block" }}
              >
                {overview.total_parsed_rows.toLocaleString()} parsed rows
              </Typography>
            </CardContent>
          </GlassCard>
        </Box>
      </Box>
    </Fade>
  );
};
