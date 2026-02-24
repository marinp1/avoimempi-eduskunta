import AccountTreeIcon from "@mui/icons-material/AccountTree";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  DocumentCard,
  extractDocumentIdentifiers,
} from "#client/components/DocumentCards";
import { colors } from "#client/theme";
import {
  parseRichTextDocument,
  type RichTextInline,
} from "../../shared/typings/RichText";

const INITIAL_VISIBLE_REFS = 6;

type DocumentLifecycleProps = {
  currentIdentifier: string;
  directReferenceValues?: Array<string | null | undefined>;
  richTextValues?: Array<string | null | undefined>;
};

const normalizeIdentifier = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s+vp$/i, "")
    .toUpperCase();

const collectInlineReferences = (
  inlines: RichTextInline[],
  references: string[],
) => {
  for (const inline of inlines) {
    if (inline.type !== "text") continue;
    if (inline.reference?.type !== "document") continue;
    if (!inline.reference.identifier) continue;
    references.push(inline.reference.identifier);
  }
};

const extractRichTextReferences = (
  richTextValues: Array<string | null | undefined>,
): string[] => {
  const references: string[] = [];

  for (const richTextValue of richTextValues) {
    const parsed = parseRichTextDocument(richTextValue);
    if (!parsed) continue;

    for (const block of parsed.blocks) {
      if (
        block.type === "paragraph" ||
        block.type === "heading" ||
        block.type === "indented"
      ) {
        collectInlineReferences(block.inlines, references);
        continue;
      }

      if (block.type === "list") {
        for (const item of block.items) {
          collectInlineReferences(item.inlines, references);
        }
        continue;
      }

      for (const row of block.rows) {
        for (const cell of row.cells) {
          collectInlineReferences(cell.inlines, references);
        }
      }
    }
  }

  return references;
};

export const DocumentLifecycle: React.FC<DocumentLifecycleProps> = ({
  currentIdentifier,
  directReferenceValues = [],
  richTextValues = [],
}) => {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const [apiIdentifiers, setApiIdentifiers] = useState<string[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    setShowAll(false);
    let cancelled = false;
    setApiLoading(true);

    fetch(`/api/documents/${encodeURIComponent(currentIdentifier)}/relations`)
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: Array<{ related_identifier?: string | null }>) => {
        if (cancelled) return;
        const identifiers = rows
          .map((row) => row.related_identifier?.trim())
          .filter((value): value is string => !!value);
        setApiIdentifiers(identifiers);
      })
      .catch(() => {
        if (!cancelled) setApiIdentifiers([]);
      })
      .finally(() => {
        if (!cancelled) setApiLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentIdentifier]);

  const documentRefs = useMemo(() => {
    const richTextReferences = extractRichTextReferences(richTextValues);
    const candidates = [
      ...directReferenceValues,
      ...richTextReferences,
      ...apiIdentifiers,
    ];
    const extracted = extractDocumentIdentifiers(candidates);
    const normalizedCurrent = normalizeIdentifier(currentIdentifier);
    const seen = new Set<string>();

    return extracted.filter((ref) => {
      const normalized = normalizeIdentifier(ref.identifier);
      if (normalized === normalizedCurrent) return false;
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
  }, [
    currentIdentifier,
    directReferenceValues,
    richTextValues,
    apiIdentifiers,
  ]);

  const visibleReferences = showAll
    ? documentRefs
    : documentRefs.slice(0, INITIAL_VISIBLE_REFS);
  const hiddenReferenceCount = Math.max(
    0,
    documentRefs.length - visibleReferences.length,
  );

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <AccountTreeIcon sx={{ color: colors.primary }} />
        <Typography
          variant="subtitle1"
          sx={{ fontWeight: 600, color: colors.textPrimary }}
        >
          {t("documents.lifecycle", "Asiakirjaketju")}
        </Typography>
      </Stack>

      {apiLoading && (
        <Typography variant="body2" sx={{ color: colors.textSecondary, mb: 1 }}>
          {t("documents.lifecycleLoading", "Ladataan asiakirjaketjua...")}
        </Typography>
      )}

      {documentRefs.length === 0 && (
        <Typography variant="body2" sx={{ color: colors.textSecondary }}>
          {t(
            "documents.lifecycleNoReferences",
            "Ei tunnistettuja asiakirjaviitteitä tässä asiakirjassa.",
          )}
        </Typography>
      )}

      {visibleReferences.map((docRef) => (
        <DocumentCard key={docRef.identifier} docRef={docRef} />
      ))}

      {hiddenReferenceCount > 0 && (
        <Button
          size="small"
          sx={{ mt: 1, textTransform: "none" }}
          onClick={() => setShowAll((prev) => !prev)}
          endIcon={
            <ExpandMoreIcon
              sx={{
                fontSize: 16,
                transform: showAll ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          }
        >
          {showAll
            ? t("documents.lifecycleShowLess", "Näytä vähemmän")
            : t(
                "documents.lifecycleShowMore",
                `Näytä lisää (+${hiddenReferenceCount})`,
              )}
        </Button>
      )}
    </Box>
  );
};
