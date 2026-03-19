import {
  ExpandMore as ExpandMoreIcon,
  UnfoldMore as UnfoldMoreIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { colors } from "#client/theme";
import { DataCard } from "#client/theme/components";

const DocumentCardShellComponent: React.FC<{
  title: React.ReactNode;
  identifier?: string | null;
  eyebrow?: React.ReactNode;
  status?: React.ReactNode;
  meta?: React.ReactNode;
  topics?: React.ReactNode;
  actions?: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
  onOpenDrawer?: () => void;
  toggleLabel: string;
  collapseLabel: string;
  loadingState?: React.ReactNode;
  error?: string | null;
  children?: React.ReactNode;
}> = ({
  title,
  identifier,
  eyebrow,
  status,
  meta,
  topics,
  actions,
  expanded,
  onToggle,
  onOpenDrawer,
  toggleLabel,
  collapseLabel,
  loadingState,
  error,
  children,
}) => (
  <DataCard
    sx={{
      overflow: "hidden",
      background: "#fff",
      contentVisibility: "auto",
      containIntrinsicSize: "420px",
    }}
  >
    <Box
      sx={{
        p: { xs: 2, md: 2.5 },
        background: `${colors.primary}03`,
      }}
    >
      <Stack spacing={1.5}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          justifyContent="space-between"
          gap={1}
        >
          <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.75}>
            {identifier && (
              <Chip
                label={identifier}
                size="small"
                sx={{
                  backgroundColor: `${colors.primary}12`,
                  color: colors.primary,
                  fontWeight: 700,
                  fontFamily: '"IBM Plex Mono", "Roboto Mono", monospace',
                }}
              />
            )}
            {eyebrow}
          </Stack>
          {status}
        </Stack>

        <Typography
          variant="h5"
          sx={{
            color: colors.textPrimary,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            lineHeight: 1.22,
          }}
        >
          {title}
        </Typography>

        {meta && (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            {meta}
          </Box>
        )}

        {topics && <Box>{topics}</Box>}

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ xs: "stretch", sm: "center" }}
          justifyContent="space-between"
          sx={{ pt: 0.5 }}
        >
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 1,
              alignItems: "center",
            }}
          >
            {actions}
          </Box>
          <Button
            variant="outlined"
            color="primary"
            onClick={onOpenDrawer ?? onToggle}
            startIcon={
              onOpenDrawer ? (
                <UnfoldMoreIcon />
              ) : expanded ? (
                <ExpandMoreIcon />
              ) : (
                <UnfoldMoreIcon />
              )
            }
            aria-haspopup={onOpenDrawer ? "dialog" : undefined}
            aria-expanded={onOpenDrawer ? undefined : expanded}
            sx={{
              alignSelf: { xs: "stretch", sm: "center" },
              minWidth: { sm: 152 },
            }}
          >
            {onOpenDrawer ? toggleLabel : expanded ? collapseLabel : toggleLabel}
          </Button>
        </Stack>
      </Stack>
    </Box>

    {!onOpenDrawer && (
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            borderTop: `1px solid ${colors.dataBorder}`,
            backgroundColor: colors.backgroundPaper,
            p: { xs: 2, md: 2.5 },
          }}
        >
          {loadingState}
          {!loadingState && error && (
            <Alert severity="error" sx={{ mb: children ? 2 : 0 }}>
              {error}
            </Alert>
          )}
          {!loadingState && children}
        </Box>
      </Collapse>
    )}
  </DataCard>
);

export const DocumentCardShell = React.memo(DocumentCardShellComponent);
