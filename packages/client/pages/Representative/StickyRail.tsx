import { Box, Divider, Link, Typography } from "@mui/material";
import type React from "react";
import { useThemedColors } from "../../theme/ThemeContext";
import { ActionsCluster } from "./ActionsCluster";
import type { ProfileSection } from "./sections/registry";

interface StickyRailProps {
  personId: number;
  fullName: string;
  party?: string | null;
  sections: ProfileSection[];
  activeAnchor: string | null;
}

/**
 * Desktop: vertical sticky rail with identity + jump anchors + actions.
 * Mobile: collapses to a horizontal chip strip via responsive sx.
 */
export const StickyRail: React.FC<StickyRailProps> = ({
  personId,
  fullName,
  party,
  sections,
  activeAnchor,
}) => {
  const themed = useThemedColors();

  const handleJump = (anchor: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const target = document.getElementById(anchor);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", `#${anchor}`);
    }
  };

  return (
    <Box
      component="aside"
      sx={{
        position: { lg: "sticky" },
        top: { lg: 16 },
        alignSelf: "flex-start",
        width: { xs: "100%", lg: 240 },
        flexShrink: 0,
        py: { xs: 1, lg: 2 },
        px: { xs: 1.5, lg: 1.5 },
      }}
    >
      <Box sx={{ display: { xs: "none", lg: "block" } }}>
        <Typography
          variant="caption"
          sx={{
            color: themed.textTertiary,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Profiili
        </Typography>
        <Typography
          variant="subtitle2"
          sx={{ fontWeight: 700, color: themed.textPrimary, mt: 0.25 }}
        >
          {fullName}
        </Typography>
        {party && (
          <Typography
            variant="caption"
            sx={{ color: themed.textSecondary, display: "block" }}
          >
            {party}
          </Typography>
        )}
        <Divider sx={{ my: 1.5 }} />
      </Box>

      <Box
        sx={{
          display: { xs: "flex", lg: "block" },
          flexDirection: { xs: "row", lg: "column" },
          gap: { xs: 0.75, lg: 0 },
          overflowX: { xs: "auto", lg: "visible" },
          py: { xs: 0.5, lg: 0 },
          ...{
            "&::-webkit-scrollbar": { display: "none" },
            scrollbarWidth: "none",
          },
        }}
      >
        {sections.map((section) => {
          const isActive = activeAnchor === section.anchor;
          return (
            <Link
              key={section.key}
              href={`#${section.anchor}`}
              onClick={handleJump(section.anchor)}
              sx={{
                display: "block",
                flexShrink: 0,
                px: { xs: 1.25, lg: 1.25 },
                py: { xs: 0.5, lg: 0.5 },
                mb: { lg: 0.25 },
                fontSize: "0.75rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? themed.textPrimary : themed.textSecondary,
                background: isActive ? "rgba(27, 42, 74, 0.06)" : "transparent",
                borderRadius: 999,
                whiteSpace: "nowrap",
                textDecoration: "none",
                transition: "background-color 150ms ease",
                "&:hover": {
                  color: themed.textPrimary,
                  textDecoration: "none",
                  background: "rgba(27, 42, 74, 0.04)",
                },
              }}
            >
              {section.label}
            </Link>
          );
        })}
      </Box>

      <Box sx={{ display: { xs: "none", lg: "block" }, mt: 2 }}>
        <Divider sx={{ mb: 1 }} />
        <ActionsCluster personId={personId} />
      </Box>
    </Box>
  );
};
