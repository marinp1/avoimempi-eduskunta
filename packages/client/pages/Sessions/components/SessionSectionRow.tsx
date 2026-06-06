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
        px: 1.5,
        py: 1,
        cursor: "pointer",
        borderBottom: `1px solid ${colors.dataBorder}`,
        background: isActive
          ? `${colors.primaryLight}14`
          : isFocused
            ? `${colors.primaryLight}0e`
            : "transparent",
        "&:hover": {
          background: isActive
            ? `${colors.primaryLight}16`
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
