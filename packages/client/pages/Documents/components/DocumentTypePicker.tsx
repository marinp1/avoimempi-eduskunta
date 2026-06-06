import {
  Description as DescriptionIcon,
  QuestionAnswer as QuestionAnswerIcon,
  Reply as ReplyIcon,
  Summarize as SummarizeIcon,
} from "@mui/icons-material";
import { Box, Chip, Stack, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors } from "#client/theme/index";

type DocumentType =
  | "interpellations"
  | "government-proposals"
  | "written-questions"
  | "written-question-responses"
  | "oral-questions"
  | "committee-reports"
  | "legislative-initiatives-law"
  | "legislative-initiatives-budget"
  | "legislative-initiatives-supplementary-budget"
  | "legislative-initiatives-action"
  | "legislative-initiatives-discussion"
  | "legislative-initiatives-citizens"
  | "expert-statements"
  | "parliament-answers";

type CategoryKey = "questions" | "proposals" | "reports" | "answers";

type Category = {
  key: CategoryKey;
  labelKey: string;
  icon: React.ReactNode;
  types: DocumentType[];
};

const CATEGORIES: Category[] = [
  {
    key: "questions",
    labelKey: "categoryQuestions",
    icon: <QuestionAnswerIcon sx={{ fontSize: 16 }} />,
    types: [
      "written-questions",
      "written-question-responses",
      "oral-questions",
      "interpellations",
    ],
  },
  {
    key: "proposals",
    labelKey: "categoryProposals",
    icon: <DescriptionIcon sx={{ fontSize: 16 }} />,
    types: [
      "government-proposals",
      "legislative-initiatives-law",
      "legislative-initiatives-budget",
      "legislative-initiatives-supplementary-budget",
      "legislative-initiatives-action",
      "legislative-initiatives-discussion",
      "legislative-initiatives-citizens",
    ],
  },
  {
    key: "reports",
    labelKey: "categoryReports",
    icon: <SummarizeIcon sx={{ fontSize: 16 }} />,
    types: ["committee-reports", "expert-statements"],
  },
  {
    key: "answers",
    labelKey: "categoryAnswers",
    icon: <ReplyIcon sx={{ fontSize: 16 }} />,
    types: ["parliament-answers"],
  },
];

const TYPE_LABEL_KEYS: Record<DocumentType, string> = {
  interpellations: "interpellations",
  "government-proposals": "governmentProposals",
  "written-questions": "writtenQuestions",
  "written-question-responses": "writtenQuestionResponses",
  "oral-questions": "oralQuestions",
  "committee-reports": "committeeReports",
  "legislative-initiatives-law": "legislativeInitiativesLaw",
  "legislative-initiatives-budget": "legislativeInitiativesBudget",
  "legislative-initiatives-supplementary-budget":
    "legislativeInitiativesSupplementaryBudget",
  "legislative-initiatives-action": "legislativeInitiativesAction",
  "legislative-initiatives-discussion": "legislativeInitiativesDiscussion",
  "legislative-initiatives-citizens": "legislativeInitiativesCitizens",
  "expert-statements": "expertStatements",
  "parliament-answers": "parliamentAnswers",
};

function getCategoryForType(type: DocumentType): CategoryKey {
  for (const cat of CATEGORIES) {
    if (cat.types.includes(type)) return cat.key;
  }
  return "questions";
}

const DocumentTypePickerComponent: React.FC<{
  value: DocumentType;
  onChange: (type: DocumentType) => void;
}> = ({ value, onChange }) => {
  const { t } = useScopedTranslation("documents");

  const activeCategory = useMemo(() => getCategoryForType(value), [value]);
  const activeCategoryData = useMemo(
    () => CATEGORIES.find((c) => c.key === activeCategory)!,
    [activeCategory],
  );

  return (
    <Stack spacing={1.5}>
      {/* Category row */}
      <Box
        sx={{
          display: "flex",
          gap: 0.75,
          overflowX: "auto",
          pb: 0.5,
          mx: -0.5,
          px: 0.5,
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = cat.key === activeCategory;
          return (
            <Chip
              key={cat.key}
              icon={cat.icon as React.ReactElement}
              label={t(cat.labelKey as any)}
              onClick={() => {
                if (!isActive) {
                  onChange(cat.types[0]);
                }
              }}
              sx={{
                fontWeight: 600,
                fontSize: "0.8125rem",
                borderRadius: "8px",
                height: 34,
                flexShrink: 0,
                transition: "all 0.15s ease",
                ...(isActive
                  ? {
                      backgroundColor: colors.primary,
                      color: "#fff",
                      "& .MuiChip-icon": { color: "#fff" },
                      "&:hover": {
                        backgroundColor: colors.primaryDark,
                      },
                    }
                  : {
                      backgroundColor: `${colors.primary}08`,
                      color: colors.textSecondary,
                      border: `1px solid ${colors.dataBorder}`,
                      "& .MuiChip-icon": { color: colors.textTertiary },
                      "&:hover": {
                        backgroundColor: `${colors.primary}14`,
                        color: colors.primary,
                        borderColor: colors.primaryLight,
                        "& .MuiChip-icon": { color: colors.primary },
                      },
                    }),
              }}
            />
          );
        })}
      </Box>

      {/* Sub-type row */}
      {activeCategoryData.types.length > 1 && (
        <Box
          sx={{
            display: "flex",
            gap: 0.5,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: colors.textTertiary,
              fontWeight: 600,
              letterSpacing: "0.03em",
              display: "flex",
              alignItems: "center",
              mr: 0.25,
            }}
          >
            {t(activeCategoryData.labelKey as any)}:
          </Typography>
          {activeCategoryData.types.map((type) => {
            const isActive = type === value;
            return (
              <Chip
                key={type}
                label={t(TYPE_LABEL_KEYS[type] as any)}
                size="small"
                onClick={() => onChange(type)}
                sx={{
                  fontWeight: isActive ? 700 : 500,
                  fontSize: "0.75rem",
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                  ...(isActive
                    ? {
                        backgroundColor: `${colors.primary}15`,
                        color: colors.primary,
                        border: `1px solid ${colors.primary}40`,
                      }
                    : {
                        backgroundColor: "transparent",
                        color: colors.textSecondary,
                        border: `1px solid transparent`,
                        "&:hover": {
                          backgroundColor: `${colors.primary}08`,
                          color: colors.primary,
                        },
                      }),
                }}
              />
            );
          })}
        </Box>
      )}
    </Stack>
  );
};

export const DocumentTypePicker = React.memo(DocumentTypePickerComponent);
