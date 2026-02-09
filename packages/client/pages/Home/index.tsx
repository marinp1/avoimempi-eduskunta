import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { PageHeader, DataCard } from "#client/theme/components";
import { colors } from "#client/theme/index";

const Home = () => {
  const { t } = useTranslation();

  return (
    <Box>
      <PageHeader
        title={t("home.title")}
        subtitle={t("home.subtitle")}
      />
      <DataCard sx={{ p: 4, textAlign: "center" }}>
        <Typography variant="h6" sx={{ color: colors.textSecondary, mb: 1 }}>
          {t("home.placeholder")}
        </Typography>
        <Typography variant="body2" sx={{ color: colors.textTertiary }}>
          {t("home.placeholderDescription")}
        </Typography>
      </DataCard>
    </Box>
  );
};

export default Home;
