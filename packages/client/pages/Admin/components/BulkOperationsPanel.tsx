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
      alert("Please select at least one table");
      return;
    }
    onStart(Array.from(selectedTables));
    setShowSelection(false);
  };

  const isAllSelected = selectedTables.size === filteredTables.length;

  return (
    <Fade in timeout={600}>
      <Box>
        <GlassCard sx={{ mb: spacing.md }}>
          <CardContent sx={{ p: spacing.md }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: spacing.sm,
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
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
                {selectedTables.size > 0 && !isRunning && (
                  <Typography variant="caption" color="text.secondary">
                    {selectedTables.size} table(s) selected
                  </Typography>
                )}
              </Box>

              {!isRunning ? (
                <Box sx={{ display: "flex", gap: 1 }}>
                  {!showSelection ? (
                    <GradientButton
                      onClick={() => {
                        setShowSelection(true);
                        // Pre-select all eligible tables
                        setSelectedTables(
                          new Set(filteredTables.map((t) => t.table_name)),
                        );
                      }}
                      startIcon={<PlayArrowIcon />}
                      disabled={disabled || filteredTables.length === 0}
                      sx={{ background: gradient }}
                    >
                      Configure
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
                        Cancel
                      </Button>
                      <GradientButton
                        onClick={handleStart}
                        startIcon={<PlayArrowIcon />}
                        disabled={selectedTables.size === 0}
                        sx={{ background: gradient }}
                      >
                        Start ({selectedTables.size})
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
                  Stop
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
                    Select Tables
                  </Typography>
                  <Button size="small" onClick={handleToggleAll}>
                    {isAllSelected ? "Deselect All" : "Select All"}
                  </Button>
                </Box>
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
                      <Typography variant="body2">
                        {table.table_name}
                      </Typography>
                    }
                    sx={{ display: "flex", width: "100%" }}
                  />
                ))}
              </Box>
            )}

            {isRunning && (
              <Box sx={{ mt: spacing.sm }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {progress}
                </Typography>
                {currentTable && (
                  <Typography
                    variant="body2"
                    fontWeight="600"
                    sx={{ mb: 1, color: themedColors.textPrimary }}
                  >
                    Current: {currentTable}
                  </Typography>
                )}
                <LinearProgress
                  variant="determinate"
                  value={progressPercent}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: themedColors.backgroundSubtle,
                    "& .MuiLinearProgress-bar": {
                      background: gradient,
                      borderRadius: 4,
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
