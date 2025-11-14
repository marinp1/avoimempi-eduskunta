import { type SxProps, type Theme } from "@mui/material";

/**
 * Vote result colors - theme-aware
 */
export const getVoteColors = (themedColors: {
  success: string;
  error: string;
  warning: string;
}) => ({
  yes: themedColors.success,
  no: themedColors.error,
  abstain: themedColors.warning,
  absent: "#9e9e9e",
});

/**
 * Vote result box styles - theme-aware
 */
export const getVoteBoxStyles = (themedColors: {
  success: string;
  error: string;
  warning: string;
}) => ({
  yes: {
    background: themedColors.success + "20",
    border: `1px solid ${themedColors.success}60`,
    color: themedColors.success,
  } satisfies SxProps<Theme>,

  no: {
    background: themedColors.error + "20",
    border: `1px solid ${themedColors.error}60`,
    color: themedColors.error,
  } satisfies SxProps<Theme>,

  abstain: {
    background: themedColors.warning + "20",
    border: `1px solid ${themedColors.warning}60`,
    color: themedColors.warning,
  } satisfies SxProps<Theme>,

  absent: {
    background: "rgba(158, 158, 158, 0.1)",
    border: "1px solid rgba(158, 158, 158, 0.2)",
    color: "#9e9e9e",
  } satisfies SxProps<Theme>,
});

/**
 * Get vote color by type - theme-aware
 */
export const getVoteColor = (
  voteType: "yes" | "no" | "abstain" | "absent",
  themedColors: { success: string; error: string; warning: string },
): string => {
  const colors = getVoteColors(themedColors);
  return colors[voteType];
};

/**
 * Get vote box style by type - theme-aware
 */
export const getVoteBoxStyle = (
  voteType: "yes" | "no" | "abstain" | "absent",
  themedColors: { success: string; error: string; warning: string },
): SxProps<Theme> => {
  const styles = getVoteBoxStyles(themedColors);
  return styles[voteType];
};
