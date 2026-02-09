import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import {
  Box,
  Button,
  CardContent,
  Checkbox,
  Fade,
  FormControlLabel,
  LinearProgress,
  Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { gradients, spacing } from "#client/theme";
import { GlassCard, GradientButton } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";

type TableStatus = {
  table_name: string;
  has_raw_data: boolean;
  has_parsed_data: boolean;
};

interface BulkOperationsPanelProps {
  title: string;
  description: string;
  tableStatuses: TableStatus[];
  isRunning: boolean;
  progress: string;
  progressPercent: number;
  currentTable: string | null;
  onStart: (selectedTables: string[]) => void;
  onStop: () => void;
  gradient: string;
  disabled?: boolean;
  filterCondition?: (table: TableStatus) => boolean;
}

export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  title,
  description,
  tableStatuses,
  isRunning,
  progress,
  progressPercent,
  currentTable,
  onStart,
  onStop,
  gradient,
  disabled = false,
  filterCondition,
}) => {
  const { t } = useTranslation();
  const themedColors = useThemedColors();
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [showSelection, setShowSelection] = useState(false);

  const filteredTables = filterCondition
    ? tableStatuses.filter(filterCondition)
    : tableStatuses;

  const handleToggleAll = () => {
    if (selectedTables.size === filteredTables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(filteredTables.map((t) => t.table_name)));
    }
  };

  const handleToggleTable = (tableName: string) => {
    const newSelected = new Set(selectedTables);
    if (newSelected.has(tableName)) {
      newSelected.delete(tableName);
    } else {
      newSelected.add(tableName);
    }
    setSelectedTables(newSelected);
  };

  const handleStart = () => {
    if (selectedTables.size === 0) {
      alert(t("admin.bulkOperations.selectAtLeastOne"));
      return;
    }
    onStart(Array.from(selectedTables));
    setShowSelection(false);
  };

  const isAllSelected = selectedTables.size === filteredTables.length;

  return (
    <Fade in timeout={600}>
      <Box>
        <GlassCard sx={{ mb: spacing.sm }}>
          <CardContent sx={{ p: spacing.sm, "&:last-child": { pb: spacing.sm } }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Box>
                <Typography
                  variant="h6"
                  fontWeight="600"
                  sx={{
                    background: gradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {description}
                </Typography>
                {selectedTables.size > 0 && !isRunning && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block" }}
                  >
                    {selectedTables.size} {t("admin.bulkOperations.tablesSelected")}
                  </Typography>
                )}
              </Box>

              {!isRunning ? (
                <Box sx={{ display: "flex", gap: 1 }}>
                  {!showSelection ? (
                    <GradientButton
                      onClick={() => {
                        setShowSelection(true);
                        setSelectedTables(
                          new Set(filteredTables.map((t) => t.table_name)),
                        );
                      }}
                      startIcon={<PlayArrowIcon />}
                      disabled={disabled || filteredTables.length === 0}
                      sx={{ background: gradient }}
                    >
                      {t("common.configure")}
                    </GradientButton>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          setShowSelection(false);
                          setSelectedTables(new Set());
                        }}
                        size="small"
                      >
                        {t("common.cancel")}
                      </Button>
                      <GradientButton
                        onClick={handleStart}
                        startIcon={<PlayArrowIcon />}
                        disabled={selectedTables.size === 0}
                        sx={{ background: gradient }}
                      >
                        {t("common.start")} ({selectedTables.size})
                      </GradientButton>
                    </>
                  )}
                </Box>
              ) : (
                <GradientButton
                  onClick={onStop}
                  startIcon={<StopIcon />}
                  sx={{
                    background: gradients.danger,
                  }}
                >
                  {t("common.stop")}
                </GradientButton>
              )}
            </Box>

            {showSelection && !isRunning && (
              <Box
                sx={{
                  mt: spacing.sm,
                  p: spacing.sm,
                  bgcolor: themedColors.backgroundSubtle,
                  borderRadius: 2,
                  maxHeight: 300,
                  overflowY: "auto",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 1,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="600">
                    {t("admin.bulkOperations.selectTables")}
                  </Typography>
                  <Button size="small" onClick={handleToggleAll}>
                    {isAllSelected
                      ? t("common.deselectAll")
                      : t("common.selectAll")}
                  </Button>
                </Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "1fr 1fr",
                      md: "1fr 1fr 1fr",
                    },
                    gap: 0,
                  }}
                >
                  {filteredTables.map((table) => (
                    <FormControlLabel
                      key={table.table_name}
                      control={
                        <Checkbox
                          checked={selectedTables.has(table.table_name)}
                          onChange={() => handleToggleTable(table.table_name)}
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                          {table.table_name}
                        </Typography>
                      }
                    />
                  ))}
                </Box>
              </Box>
            )}

            {isRunning && (
              <Box sx={{ mt: spacing.sm }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mb: 0.5, display: "block" }}
                >
                  {progress}
                </Typography>
                {currentTable && (
                  <Typography
                    variant="body2"
                    fontWeight="600"
                    fontFamily="monospace"
                    sx={{ mb: 1, color: themedColors.textPrimary, fontSize: "0.8125rem" }}
                  >
                    {t("admin.bulkOperations.current")} {currentTable}
                  </Typography>
                )}
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: themedColors.backgroundSubtle,
                    "& .MuiLinearProgress-bar": {
                      background: gradient,
                      borderRadius: 3,
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  {progressPercent.toFixed(1)}%
                </Typography>
              </Box>
            )}
          </CardContent>
        </GlassCard>
      </Box>
    </Fade>
  );
};
