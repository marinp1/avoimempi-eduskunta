import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Link, type LinkProps } from "@mui/material";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toEduskuntaUrl } from "#client/utils/eduskunta-links";

type EduskuntaSourceLinkProps = Omit<LinkProps, "href" | "children"> & {
  href: string;
  children: ReactNode;
  showExternalIcon?: boolean;
  showOfficialCue?: boolean;
  stopPropagation?: boolean;
};

export function EduskuntaSourceLink({
  href,
  children,
  showExternalIcon = true,
  showOfficialCue = true,
  stopPropagation = false,
  target,
  rel,
  sx,
  onClick,
  ...rest
}: EduskuntaSourceLinkProps) {
  const { t } = useTranslation();
  return (
    <Link
      href={toEduskuntaUrl(href)}
      target={target ?? "_blank"}
      rel={rel ?? "noopener noreferrer"}
      underline="none"
      onClick={(event) => {
        if (stopPropagation) event.stopPropagation();
        onClick?.(event);
      }}
      sx={[
        {
          display: "inline-flex",
          alignItems: "center",
          gap: 0.5,
          fontSize: "0.75rem",
          fontWeight: 600,
          lineHeight: 1.2,
          color: "primary.main",
          "&:hover": {
            textDecoration: "underline",
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      {children}
      {showOfficialCue && (
        <Box
          component="span"
          sx={{
            fontSize: "0.625rem",
            fontWeight: 700,
            letterSpacing: 0.2,
            textTransform: "uppercase",
            border: "1px solid currentColor",
            borderRadius: 999,
            px: 0.5,
            py: 0.125,
            lineHeight: 1.1,
            opacity: 0.85,
          }}
        >
          {t("common.officialSourceEduskunta", "eduskunta.fi")}
        </Box>
      )}
      {showExternalIcon && <OpenInNewIcon sx={{ fontSize: 12 }} />}
    </Link>
  );
}
