import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { Box, Collapse, IconButton } from "@mui/material";
import type { KeyboardEvent, ReactNode } from "react";
import { colors } from "#client/theme";

type SessionSectionPanelProps = {
  sectionId: number;
  sectionKey: string;
  isExpanded: boolean;
  isFocused?: boolean;
  onToggle: () => void;
  headerContent: ReactNode;
  children: ReactNode;
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

export const SessionSectionPanel = ({
  sectionId,
  sectionKey,
  isExpanded,
  isFocused = false,
  onToggle,
  headerContent,
  children,
}: SessionSectionPanelProps) => {
  const sectionCollapseId = `session-section-panel-${sectionId}`;
  const sectionToggleId = `session-section-toggle-${sectionId}`;

  return (
    <Box
      id={`session-section-${sectionKey}`}
      sx={{
        borderBottom: `1px solid ${colors.dataBorder}`,
        background: isFocused ? `${colors.primaryLight}10` : "transparent",
      }}
    >
      <Box
        id={sectionToggleId}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={sectionCollapseId}
        onClick={onToggle}
        onKeyDown={(event) => handleActivateOnKeyDown(event, onToggle)}
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "pointer",
          width: "100%",
          border: 0,
          textAlign: "left",
          background: "transparent",
          "&:hover": { background: colors.backgroundSubtle },
          "&:focus-visible": {
            outline: `2px solid ${colors.primaryLight}`,
            outlineOffset: -2,
          },
          transition: "background 0.15s",
        }}
      >
        {headerContent}
        <IconButton
          size="small"
          tabIndex={-1}
          aria-hidden
          sx={{ color: colors.primaryLight, flexShrink: 0 }}
        >
          {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
        </IconButton>
      </Box>

      <Collapse
        id={sectionCollapseId}
        aria-labelledby={sectionToggleId}
        in={isExpanded}
        timeout="auto"
        unmountOnExit
      >
        <Box
          sx={{
            px: 2,
            pb: 2,
            borderTop: `1px solid ${colors.dataBorder}`,
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
};
