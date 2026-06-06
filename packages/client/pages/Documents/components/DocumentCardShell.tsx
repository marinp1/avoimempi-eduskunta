import { UnfoldMore as UnfoldMoreIcon } from "@mui/icons-material";
import {
  Alert,
  Box,
  ButtonBase,
  Collapse,
  Stack,
  Typography,
} from "@mui/material";
import React from "react";
import { colors } from "#client/theme";
import { paperDocumentSx } from "../cards/shared";

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
  accentColor?: string;
  typeBadge?: React.ReactNode;
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
  accentColor,
  typeBadge,
}) => (
  <Box
    sx={{
      ...paperDocumentSx,
      contentVisibility: "auto",
      containIntrinsicSize: "auto 160px",
      ...(accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}),
      mb: 1.5,
    }}
  >
    <ButtonBase
      component="div"
      onClick={onOpenDrawer ?? onToggle}
      aria-haspopup={onOpenDrawer ? "dialog" : undefined}
      aria-expanded={onOpenDrawer ? undefined : expanded}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        p: { xs: 1.5, md: 2 },
        borderRadius: "4px",
        "&:hover": {
          backgroundColor: "rgba(27, 42, 74, 0.015)",
        },
      }}
    >
      {/* Top line: type badge + identifier + status */}
      <Stack
        direction="row"
        spacing={0.75}
        alignItems="center"
        flexWrap="wrap"
        gap={0.5}
        sx={{ mb: 0.75 }}
      >
        {typeBadge}
        {identifier && (
          <Typography
            variant="caption"
            sx={{
              color: colors.textSecondary,
              fontFamily: '"IBM Plex Mono", "Roboto Mono", monospace',
              fontWeight: 600,
              fontSize: "0.7rem",
              letterSpacing: "0.02em",
            }}
          >
            {identifier}
          </Typography>
        )}
        {eyebrow}
        <Box sx={{ flex: 1 }} />
        {status}
      </Stack>

      {/* Title - clamped to 2 lines */}
      <Typography
        variant="body1"
        sx={{
          color: colors.textPrimary,
          fontWeight: 600,
          lineHeight: 1.4,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          mb: meta || topics ? 0.75 : 0,
        }}
      >
        {title}
      </Typography>

      {/* Compact meta line */}
      {meta && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            mb: topics ? 0.5 : 0,
          }}
        >
          {meta}
        </Box>
      )}

      {/* Topics - single line, overflow hidden */}
      {topics && (
        <Box
          sx={{
            overflow: "hidden",
            maxHeight: 28,
          }}
        >
          {topics}
        </Box>
      )}

      {/* Subtle "open" indicator */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          mt: 0.5,
          gap: 0.5,
        }}
      >
        {actions}
        <Typography
          variant="caption"
          sx={{
            color: colors.primaryLight,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 0.25,
          }}
        >
          <UnfoldMoreIcon sx={{ fontSize: 14 }} />
          {onOpenDrawer ? toggleLabel : expanded ? collapseLabel : toggleLabel}
        </Typography>
      </Box>
    </ButtonBase>

    {!onOpenDrawer && (
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box
          sx={{
            borderTop: `1px solid ${colors.dataBorder}`,
            p: { xs: 1.5, md: 2 },
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
  </Box>
);

export const DocumentCardShell = React.memo(DocumentCardShellComponent);
