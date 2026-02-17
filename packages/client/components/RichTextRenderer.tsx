import { Box, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { ReactNode } from "react";
import { colors } from "#client/theme";
import {
  parseRichTextDocument,
  type RichTextDocument,
  type RichTextInline,
  type RichTextMark,
} from "../../shared/typings/RichText";

function inlineSxFromMarks(marks: RichTextMark[] | undefined): Record<string, string | number> {
  const sx: Record<string, string | number> = {};
  if (!marks || marks.length === 0) return sx;

  for (const mark of marks) {
    if (mark === "italic") sx.fontStyle = "italic";
    if (mark === "bold") sx.fontWeight = 700;
    if (mark === "underline") sx.textDecoration = "underline";
    if (mark === "superscript") {
      sx.verticalAlign = "super";
      sx.fontSize = "0.82em";
      sx.lineHeight = 1;
    }
    if (mark === "subscript") {
      sx.verticalAlign = "sub";
      sx.fontSize = "0.82em";
      sx.lineHeight = 1;
    }
  }

  return sx;
}

function renderInlines(inlines: RichTextInline[], keyPrefix: string): ReactNode[] {
  return inlines.map((inline, index) => {
    const key = `${keyPrefix}-${index}`;

    if (inline.type === "line_break") {
      return <br key={key} />;
    }

    const content = (
      <Box component="span" sx={inlineSxFromMarks(inline.marks)}>
        {inline.text}
      </Box>
    );

    if (inline.reference?.type === "document") {
      return (
        <Box
          key={key}
          component="span"
          title={inline.reference.identifier}
          sx={{
            color: colors.primary,
            textDecoration: "underline",
            textDecorationStyle: "dotted",
            textUnderlineOffset: "0.15em",
          }}
        >
          {content}
        </Box>
      );
    }

    return (
      <Box key={key} component="span">
        {content}
      </Box>
    );
  });
}

function headingVariant(level: 1 | 2 | 3 | 4): "h6" | "subtitle1" | "subtitle2" | "body1" {
  if (level === 1) return "h6";
  if (level === 2) return "subtitle1";
  if (level === 3) return "subtitle2";
  return "body1";
}

export type RichTextRendererProps = {
  document: RichTextDocument | string | null | undefined;
  fallbackText?: string | null;
  paragraphVariant?: "body1" | "body2";
  compact?: boolean;
  sx?: SxProps<Theme>;
};

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  document,
  fallbackText = null,
  paragraphVariant = "body2",
  compact = false,
  sx,
}) => {
  const parsed = parseRichTextDocument(document);

  if (!parsed || parsed.blocks.length === 0) {
    if (!fallbackText) return null;
    return (
      <Typography variant={paragraphVariant} sx={{ color: colors.textPrimary, whiteSpace: "pre-wrap" }}>
        {fallbackText}
      </Typography>
    );
  }

  const blockGap = compact ? 0.75 : 1.25;

  return (
    <Box sx={sx}>
      {parsed.blocks.map((block, blockIndex) => {
        const keyPrefix = `block-${blockIndex}`;
        const marginTop = blockIndex === 0 ? 0 : blockGap;

        if (block.type === "paragraph") {
          return (
            <Typography
              key={keyPrefix}
              variant={paragraphVariant}
              sx={{ mt: marginTop, color: colors.textPrimary }}
            >
              {renderInlines(block.inlines, keyPrefix)}
            </Typography>
          );
        }

        if (block.type === "heading") {
          return (
            <Typography
              key={keyPrefix}
              variant={headingVariant(block.level)}
              sx={{ mt: marginTop, color: colors.textPrimary, fontWeight: 700 }}
            >
              {renderInlines(block.inlines, keyPrefix)}
            </Typography>
          );
        }

        if (block.type === "indented") {
          return (
            <Box
              key={keyPrefix}
              sx={{
                mt: marginTop,
                pl: 2,
                py: 0.75,
                borderLeft: `3px solid ${colors.primary}55`,
                backgroundColor: `${colors.backgroundSubtle}`,
                borderRadius: 1,
              }}
            >
              <Typography variant={paragraphVariant} sx={{ color: colors.textPrimary }}>
                {renderInlines(block.inlines, keyPrefix)}
              </Typography>
            </Box>
          );
        }

        if (block.type === "table") {
          return (
            <TableContainer
              key={keyPrefix}
              sx={{
                mt: marginTop,
                border: `1px solid ${colors.dataBorder}`,
                borderRadius: 1,
                backgroundColor: colors.backgroundPaper,
              }}
            >
              <Table size="small" sx={{ minWidth: 420 }}>
                <TableBody>
                  {block.rows.map((row, rowIndex) => (
                    <TableRow key={`${keyPrefix}-row-${rowIndex}`}>
                      {row.cells.map((cell, cellIndex) => (
                        <TableCell
                          key={`${keyPrefix}-row-${rowIndex}-cell-${cellIndex}`}
                          component={cell.header ? "th" : "td"}
                          colSpan={cell.colSpan}
                          rowSpan={cell.rowSpan}
                          sx={{
                            color: colors.textPrimary,
                            borderColor: colors.dataBorder,
                            fontWeight: cell.header ? 700 : 400,
                            backgroundColor: cell.header ? colors.backgroundSubtle : "transparent",
                            verticalAlign: "top",
                          }}
                        >
                          {renderInlines(cell.inlines, `${keyPrefix}-row-${rowIndex}-cell-${cellIndex}`)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }

        return (
          <Box
            key={keyPrefix}
            component={block.ordered ? "ol" : "ul"}
            sx={{ mt: marginTop, mb: 0, pl: 2.5 }}
          >
            {block.items.map((item, itemIndex) => (
              <Box key={`${keyPrefix}-item-${itemIndex}`} component="li" sx={{ mt: itemIndex === 0 ? 0 : 0.5 }}>
                <Typography variant={paragraphVariant} sx={{ color: colors.textPrimary }}>
                  {renderInlines(item.inlines, `${keyPrefix}-item-${itemIndex}`)}
                </Typography>
              </Box>
            ))}
          </Box>
        );
      })}
    </Box>
  );
};
