import { Typography, type TypographyProps } from "@mui/material";
import { serifFontFamily } from "#client/theme";

export const SourceText: React.FC<TypographyProps> = ({ sx, ...props }) => (
  <Typography sx={{ fontFamily: serifFontFamily, ...sx }} {...props} />
);
