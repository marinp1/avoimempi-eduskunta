import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { PageHeader, DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";

const Parties = () => {
  const { t } = useTranslation();

  return (
    <Box>
      <PageHeader
        title={t("parties.title")}
        subtitle={t("parties.subtitle")}
      />
      <DataCard sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
          {t("parties.placeholder")}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.textTertiary }}>
          {t("parties.placeholderDescription")}
        </Typography>
      </DataCard>
    </Box>
  );
};

export default Parties;
