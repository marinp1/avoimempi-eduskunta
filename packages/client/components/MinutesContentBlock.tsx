import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { Box, Chip, Tooltip, Typography, type SxProps, type Theme } from "@mui/material";
import { EduskuntaSourceLink } from "#client/components/EduskuntaSourceLink";
import { SourceText } from "#client/components/SourceText";
import { colors, commonStyles } from "#client/theme";

export type MinutesContentReferenceChip = {
  code: string;
  href: string | null;
  tooltipTitle: string;
  migratedAsRollCall: boolean;
};

type MinutesContentBlockProps = {
  title: string;
  narrativeBlocks: string[];
  references: MinutesContentReferenceChip[];
  successColor?: string;
  sx?: SxProps<Theme>;
};

export const MinutesContentBlock = ({
  title,
  narrativeBlocks,
  references,
  successColor = colors.success,
  sx,
}: MinutesContentBlockProps) => {
  if (narrativeBlocks.length === 0 && references.length === 0) return null;

  return (
    <Box
      sx={[
        {
          mt: 1.5,
          px: { xs: 1.75, sm: 2 },
          py: 1.5,
          borderRadius: 1.5,
          border: `1px solid ${colors.dataBorder}`,
          background: `linear-gradient(180deg, ${colors.backgroundPaper} 0%, ${colors.backgroundSubtle} 100%)`,
          position: "relative",
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: `linear-gradient(180deg, ${colors.primaryLight} 0%, ${colors.primary} 100%)`,
            opacity: 0.75,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Typography
        sx={{
          ...commonStyles.compactTextMd,
          fontWeight: 700,
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          mb: 1,
          pl: 0.5,
        }}
      >
        {title}
      </Typography>

      {narrativeBlocks.length > 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 0.9,
            pl: 0.5,
          }}
        >
          {narrativeBlocks.map((block, index) => (
            <SourceText
              key={`${title}-minutes-block-${index}`}
              sx={{
                fontSize: "0.9rem",
                color: colors.textPrimary,
                whiteSpace: "pre-wrap",
                lineHeight: 1.72,
                letterSpacing: "0.01em",
              }}
            >
              {block}
            </SourceText>
          ))}
        </Box>
      )}

      {references.length > 0 && (
        <Box
          sx={{
            mt: narrativeBlocks.length > 0 ? 1.25 : 0,
            pt: narrativeBlocks.length > 0 ? 1 : 0,
            borderTop:
              narrativeBlocks.length > 0
                ? `1px dashed ${colors.dataBorder}`
                : "none",
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            alignItems: "center",
            pl: 0.5,
          }}
        >
          {references.map((reference, index) => {
            const color = reference.migratedAsRollCall
              ? successColor
              : colors.primaryLight;
            const chipSx = {
              ...commonStyles.compactChipSm,
              height: 24,
              fontFamily:
                '"SFMono-Regular", "SF Mono", "Roboto Mono", Consolas, monospace',
              color: reference.href ? color : colors.textSecondary,
              border: `1px solid ${reference.href ? `${color}33` : colors.dataBorder}`,
              background: reference.href
                ? `${color}12`
                : colors.backgroundPaper,
              "& .MuiChip-icon": { color: "inherit", ml: "6px" },
            };

            return (
              <Tooltip
                key={`${reference.code}-${index}`}
                title={reference.tooltipTitle}
                arrow
              >
                <span>
                  {reference.href ? (
                    <EduskuntaSourceLink
                      href={reference.href}
                      showExternalIcon={false}
                      sx={{
                        color: "inherit",
                        "&:hover": { textDecoration: "none" },
                      }}
                    >
                      <Chip
                        label={reference.code}
                        size="small"
                        icon={
                          <OpenInNewIcon sx={{ fontSize: "12px !important" }} />
                        }
                        clickable
                        sx={chipSx}
                      />
                    </EduskuntaSourceLink>
                  ) : (
                    <Chip label={reference.code} size="small" sx={chipSx} />
                  )}
                </span>
              </Tooltip>
            );
          })}
        </Box>
      )}
    </Box>
  );
};
