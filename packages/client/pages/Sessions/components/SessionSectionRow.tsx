import { Box, type SxProps, type Theme } from "@mui/material";
import type { KeyboardEvent, ReactNode } from "react";
import { colors } from "#client/theme";

type SessionSectionRowProps = {
  sectionKey: string;
  isActive: boolean;
  isFocused?: boolean;
  onSelect: () => void;
  children: ReactNode;
  sx?: SxProps<Theme>;
};

const handleActivateOnKeyDown = (
  event: KeyboardEvent,
  onActivate: () => void,
) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    onActivate();
  }
};

export const SessionSectionRow = ({
  sectionKey,
  isActive,
  isFocused = false,
  onSelect,
  children,
  sx,
}: SessionSectionRowProps) => (
  <Box
    id={`session-section-${sectionKey}`}
    role="button"
    tabIndex={0}
    aria-selected={isActive}
    onClick={onSelect}
    onKeyDown={(event) => handleActivateOnKeyDown(event, onSelect)}
    sx={[
      {
        px: 2,
        py: 1.75,
        cursor: "pointer",
        borderBottom: `1px solid ${colors.dataBorder}`,
        background: isActive
          ? `linear-gradient(180deg, ${colors.primaryLight}14 0%, ${colors.primaryLight}08 100%)`
          : isFocused
            ? `${colors.primaryLight}0e`
            : "transparent",
        transition:
          "background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease",
        "&:hover": {
          background: isActive
            ? `linear-gradient(180deg, ${colors.primaryLight}16 0%, ${colors.primaryLight}10 100%)`
            : colors.backgroundSubtle,
        },
        "&:focus-visible": {
          outline: `2px solid ${colors.primaryLight}`,
          outlineOffset: -2,
        },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    {children}
  </Box>
);
