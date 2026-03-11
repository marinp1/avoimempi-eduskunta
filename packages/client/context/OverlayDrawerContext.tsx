import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CloseIcon from "@mui/icons-material/Close";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useScopedTranslation } from "#client/i18n/scoped";
import { commonStyles, colors } from "#client/theme";

type OverlayDrawerConfig = {
  drawerKey?: string;
  title: string;
  subtitle?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  content: ReactNode;
  paperSx?: SxProps<Theme>;
  onClose?: () => void;
};

type OverlayDrawerContextValue = {
  openDrawer: (config: OverlayDrawerConfig) => void;
  openRootDrawer: (config: OverlayDrawerConfig) => void;
  replaceDrawer: (config: OverlayDrawerConfig) => void;
  currentDrawerKey: string | null;
  hasBack: boolean;
  goBack: () => void;
  closeDrawer: () => void;
  resetDrawer: () => void;
};

const OverlayDrawerContext = createContext<OverlayDrawerContextValue | null>(
  null,
);

export const OverlayDrawerProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { t: tCommon } = useScopedTranslation("common");
  const [stack, setStack] = useState<OverlayDrawerConfig[]>([]);
  const config = stack.at(-1) ?? null;
  const openDrawer = useCallback(
    (nextConfig: OverlayDrawerConfig) => setStack((prev) => [...prev, nextConfig]),
    [],
  );
  const openRootDrawer = useCallback(
    (nextConfig: OverlayDrawerConfig) => setStack([nextConfig]),
    [],
  );
  const replaceDrawer = useCallback(
    (nextConfig: OverlayDrawerConfig) =>
      setStack((prev) =>
        prev.length === 0 ? [nextConfig] : [...prev.slice(0, -1), nextConfig],
      ),
    [],
  );
  const goBack = useCallback(() => setStack((prev) => prev.slice(0, -1)), []);
  const resetDrawer = useCallback(() => setStack([]), []);
  const closeDrawer = useCallback(() => {
    stack[0]?.onClose?.();
    setStack([]);
  }, [stack]);

  const value = useMemo<OverlayDrawerContextValue>(
    () => ({
      openDrawer,
      openRootDrawer,
      replaceDrawer,
      currentDrawerKey: config?.drawerKey ?? null,
      hasBack: stack.length > 1,
      goBack,
      closeDrawer,
      resetDrawer,
    }),
    [
      closeDrawer,
      config?.drawerKey,
      goBack,
      openDrawer,
      openRootDrawer,
      replaceDrawer,
      resetDrawer,
      stack.length,
    ],
  );

  return (
    <OverlayDrawerContext.Provider value={value}>
      {children}
      <Drawer
        anchor="right"
        open={Boolean(config)}
        onClose={value.closeDrawer}
        PaperProps={{
          sx: [
            {
              width: { xs: "100%", sm: "92%", md: "78%", lg: "66%" },
              maxWidth: "1200px",
            },
            ...(config?.paperSx
              ? Array.isArray(config.paperSx)
                ? config.paperSx
                : [config.paperSx]
              : []),
          ],
        }}
      >
        {config && (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              background: `linear-gradient(180deg, ${colors.backgroundPaper} 0%, ${colors.backgroundSubtle} 100%)`,
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderBottom: `1px solid ${colors.dataBorder}`,
                background: colors.backgroundPaper,
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {value.hasBack && (
                    <IconButton
                      onClick={value.goBack}
                      aria-label={tCommon("back")}
                      size="small"
                      sx={{ color: colors.textSecondary, ml: -0.75 }}
                    >
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                  )}
                  <Typography
                    sx={{
                      ...commonStyles.compactTextMd,
                      fontWeight: 700,
                      color: colors.textTertiary,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {config.title}
                  </Typography>
                </Box>
                {config.subtitle && (
                  <Typography
                    sx={{
                      mt: 0.5,
                      fontSize: "1rem",
                      fontWeight: 700,
                      color: colors.textPrimary,
                    }}
                  >
                    {config.subtitle}
                  </Typography>
                )}
                {config.meta && (
                  <Box
                    sx={{
                      mt: 1,
                      display: "flex",
                      gap: 0.75,
                      flexWrap: "wrap",
                    }}
                  >
                    {config.meta}
                  </Box>
                )}
                {config.actions && (
                  <Box
                    sx={{
                      mt: 1.25,
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    {config.actions}
                  </Box>
                )}
              </Box>
              <IconButton
                onClick={value.closeDrawer}
                aria-label={tCommon("close")}
                size="small"
                sx={{ color: colors.textSecondary }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>
              {config.content}
            </Box>
          </Box>
        )}
      </Drawer>
    </OverlayDrawerContext.Provider>
  );
};

export const useOverlayDrawer = () => {
  const context = useContext(OverlayDrawerContext);
  if (!context) {
    throw new Error(
      "useOverlayDrawer must be used within an OverlayDrawerProvider",
    );
  }
  return context;
};
