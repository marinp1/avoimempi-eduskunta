import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { PageHeader, DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";

const Documents = () => {
  const { t } = useTranslation();

  return (
    <Box>
      <PageHeader
        title={t("documents.title")}
        subtitle={t("documents.subtitle")}
      />
      <DataCard sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
          {t("documents.placeholder")}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.textTertiary }}>
          {t("documents.placeholderDescription")}
        </Typography>
      </DataCard>
    </Box>
  );
};

export default Documents;
