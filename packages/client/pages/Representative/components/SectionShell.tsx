import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  Box,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { useThemedColors } from "../../../theme/ThemeContext";
import {
  MethodologyDrawer,
  type MethodologyTraceLink,
} from "./MethodologyDrawer";

export interface SectionShellProps {
  anchor: string;
  title: string;
  subtitle?: string;
  /**
   * Plain-Finnish explanation of how any computed metric in this section is
   * derived. Required so the "i" affordance can show methodology + trace links.
   */
  methodology: string;
  methodologyCaveats?: string;
  methodologyTraceLinks?: MethodologyTraceLink[];
  /** Right-aligned actions (e.g. "näytä kaikki", filter chips). */
  actions?: React.ReactNode;
  /**
   * When the section has no data this is the explicit Finnish empty-state
   * message. Core sections must always render — never hide damning absences.
   */
  emptyState?: React.ReactNode;
  isEmpty?: boolean;
  children?: React.ReactNode;
}

export const SectionShell: React.FC<SectionShellProps> = ({
  anchor,
  title,
  subtitle,
  methodology,
  methodologyCaveats,
  methodologyTraceLinks,
  actions,
  emptyState,
  isEmpty,
  children,
}) => {
  const themed = useThemedColors();
  const [methodologyOpen, setMethodologyOpen] = React.useState(false);

  return (
    <Box
      component="section"
      id={anchor}
      sx={{
        scrollMarginTop: 96,
        py: 3,
        borderTop: `1px solid ${themed.dataBorder}`,
        "&:first-of-type": { borderTop: "none", pt: 1 },
      }}
    >
      <Stack
        direction="row"
        alignItems="flex-start"
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 1.5 }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography
              variant="h2"
              sx={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: themed.textPrimary,
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
              }}
            >
              {title}
            </Typography>
            <Tooltip
              title={methodologyOpen ? "" : "Miten tämä osio on koottu?"}
              placement="top"
            >
              <IconButton
                size="small"
                aria-label="Näytä menetelmä"
                onClick={() => setMethodologyOpen((v) => !v)}
                sx={{ color: themed.textTertiary, p: 0.25 }}
              >
                <InfoOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          {subtitle && (
            <Typography
              variant="caption"
              sx={{ color: themed.textSecondary, display: "block", mt: 0.25 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && <Box sx={{ flexShrink: 0 }}>{actions}</Box>}
      </Stack>

      {methodologyOpen && (
        <MethodologyDrawer
          formula={methodology}
          caveats={methodologyCaveats}
          traceLinks={methodologyTraceLinks}
        />
      )}

      {isEmpty ? (
        <Box sx={{ py: 2 }}>
          <Typography
            variant="body2"
            sx={{ color: themed.textTertiary, fontStyle: "italic" }}
          >
            {emptyState ?? "Ei tietoja saatavilla tästä osiosta."}
          </Typography>
        </Box>
      ) : (
        children
      )}
    </Box>
  );
};
