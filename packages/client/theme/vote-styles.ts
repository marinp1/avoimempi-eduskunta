import { type SxProps, type Theme } from "@mui/material";
import { colors } from "./index";

/**
 * Vote result colors and styles
 */
export const voteColors = {
  yes: colors.success,
  no: colors.error,
  abstain: colors.warning,
  absent: colors.neutral,
} as const;

/**
 * Vote result box styles
 */
export const voteBoxStyles = {
  yes: {
    background: "rgba(76, 175, 80, 0.1)",
    border: "1px solid rgba(76, 175, 80, 0.2)",
    color: colors.success,
  } satisfies SxProps<Theme>,

  no: {
    background: "rgba(244, 67, 54, 0.1)",
    border: "1px solid rgba(244, 67, 54, 0.2)",
    color: colors.error,
  } satisfies SxProps<Theme>,

  abstain: {
    background: "rgba(255, 152, 0, 0.1)",
    border: "1px solid rgba(255, 152, 0, 0.2)",
    color: colors.warning,
  } satisfies SxProps<Theme>,

  absent: {
    background: "rgba(158, 158, 158, 0.1)",
    border: "1px solid rgba(158, 158, 158, 0.2)",
    color: colors.neutral,
  } satisfies SxProps<Theme>,
} as const;

/**
 * Get vote color by type
 */
export const getVoteColor = (voteType: "yes" | "no" | "abstain" | "absent"): string => {
  return voteColors[voteType];
};

/**
 * Get vote box style by type
 */
export const getVoteBoxStyle = (voteType: "yes" | "no" | "abstain" | "absent"): SxProps<Theme> => {
  return voteBoxStyles[voteType];
};
