import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import TableRowsIcon from "@mui/icons-material/TableRows";
import ViewAgendaIcon from "@mui/icons-material/ViewAgenda";
import {
  Box,
  Button,
  CardActionArea,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type React from "react";
import { TraceRegistration } from "#client/context/TraceContext";
import { useScopedTranslation } from "#client/i18n/scoped";
import { colors, commonStyles } from "#client/theme";
import { EmptyState } from "#client/theme/components";
import { useThemedColors } from "#client/theme/ThemeContext";
import type { RepresentativeSelection } from "../Details";
import {
  type CompositionBrowserView,
  type CompositionSortValue,
  calculateAgeAtDate,
  formatFinnishDate,
  type GenderFilterValue,
  type GovernmentFilterValue,
  getMemberStartDate,
  type MemberWithExtras,
} from "../helpers";

const BrowserToggleButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}> = ({ active, onClick, icon }) => (
  <IconButton
    size="small"
    onClick={onClick}
    sx={{
      border: `1px solid ${active ? colors.primary : colors.dataBorder}`,
      bgcolor: active ? `${colors.primary}10` : "transparent",
      color: active ? colors.primary : colors.textSecondary,
      borderRadius: 1,
    }}
  >
    {icon}
  </IconButton>
);

export const MemberBrowser: React.FC<{
  filteredMembers: MemberWithExtras[];
  totalMembers: number;
  compositionSearch: string;
  setCompositionSearch: (value: string) => void;
  sortBy: CompositionSortValue;
  setSortBy: (value: CompositionSortValue) => void;
  govFilter: GovernmentFilterValue;
  setGovFilter: (value: GovernmentFilterValue) => void;
  genderFilter: GenderFilterValue;
  setGenderFilter: (value: GenderFilterValue) => void;
  districtFilter: string | null;
  setDistrictFilter: (value: string | null) => void;
  districts: string[];
  ageRange: [number, number] | null;
  setAgeRange: (value: [number, number] | null) => void;
  ageMin: number;
  ageMax: number;
  partyFilter: string | null;
  setPartyFilter: React.Dispatch<React.SetStateAction<string | null>>;
  viewMode: CompositionBrowserView;
  setViewMode: (value: CompositionBrowserView) => void;
  onMemberClick: (member: MemberWithExtras) => void;
  selectedRepresentative: RepresentativeSelection | null;
  date: string;
}> = ({
  filteredMembers,
  totalMembers,
  compositionSearch,
  setCompositionSearch,
  sortBy,
  setSortBy,
  govFilter,
  setGovFilter,
  genderFilter,
  setGenderFilter,
  districtFilter,
  setDistrictFilter,
  districts,
  ageRange,
  setAgeRange,
  ageMin,
  ageMax,
  partyFilter,
  setPartyFilter,
  viewMode,
  setViewMode,
  onMemberClick,
  selectedRepresentative,
  date,
}) => {
  const { t } = useScopedTranslation("composition");
  const themedColors = useThemedColors();

  return (
    <Box>
      <Box sx={{ p: 1.5 }}>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          justifyContent="space-between"
          sx={{ mb: 1.5 }}
        >
          <Box>
            <Typography
              variant="h6"
              sx={{ color: themedColors.textPrimary, fontWeight: 700 }}
            >
              {t("browser.title")}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: themedColors.textSecondary }}
            >
              {t("browser.description")}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <BrowserToggleButton
              active={viewMode === "list"}
              onClick={() => setViewMode("list")}
              icon={<ViewAgendaIcon fontSize="small" />}
            />
            <BrowserToggleButton
              active={viewMode === "table"}
              onClick={() => setViewMode("table")}
              icon={<TableRowsIcon fontSize="small" />}
            />
          </Stack>
        </Stack>

        <Stack spacing={1} sx={{ mb: 1.5 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            <TextField
              size="small"
              fullWidth
              placeholder={t("browser.searchPlaceholder")}
              value={compositionSearch}
              onChange={(event) => setCompositionSearch(event.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18 }} />
                    </InputAdornment>
                  ),
                  endAdornment: compositionSearch ? (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setCompositionSearch("")}
                      >
                        <ClearIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </InputAdornment>
                  ) : undefined,
                },
              }}
            />

            <Select
              size="small"
              value={sortBy}
              onChange={(event) =>
                setSortBy(event.target.value as CompositionSortValue)
              }
              sx={{ minWidth: 180 }}
            >
              <MenuItem value="party">{t("browser.sort.party")}</MenuItem>
              <MenuItem value="name">{t("browser.sort.name")}</MenuItem>
              <MenuItem value="age">{t("browser.sort.age")}</MenuItem>
              <MenuItem value="tenure">{t("browser.sort.tenure")}</MenuItem>
            </Select>
          </Stack>

          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {(["all", "government", "opposition"] as const).map((value) => (
              <Chip
                key={value}
                size="small"
                label={
                  value === "all"
                    ? t("details.filters.all")
                    : value === "government"
                      ? t("details.filters.government")
                      : t("details.filters.opposition")
                }
                onClick={() => setGovFilter(value)}
                sx={{
                  fontWeight: 700,
                  bgcolor:
                    govFilter === value
                      ? themedColors.primary
                      : themedColors.backgroundPaper,
                  color:
                    govFilter === value ? "white" : themedColors.textSecondary,
                  border: `1px solid ${
                    govFilter === value
                      ? themedColors.primary
                      : themedColors.dataBorder
                  }`,
                }}
              />
            ))}

            <Box
              sx={{
                width: "1px",
                height: 20,
                bgcolor: themedColors.dataBorder,
                alignSelf: "center",
              }}
            />

            {(["all", "female", "male"] as const).map((value) => (
              <Chip
                key={value}
                size="small"
                label={
                  value === "all"
                    ? t("browser.gender.all")
                    : value === "female"
                      ? t("browser.gender.female")
                      : t("browser.gender.male")
                }
                onClick={() => setGenderFilter(value)}
                sx={{
                  fontWeight: 700,
                  bgcolor:
                    genderFilter === value
                      ? themedColors.primary
                      : themedColors.backgroundPaper,
                  color:
                    genderFilter === value
                      ? "white"
                      : themedColors.textSecondary,
                  border: `1px solid ${
                    genderFilter === value
                      ? themedColors.primary
                      : themedColors.dataBorder
                  }`,
                }}
              />
            ))}

            {partyFilter && (
              <Chip
                size="small"
                color="primary"
                label={t("browser.partyFilter", { value: partyFilter })}
                onDelete={() => setPartyFilter(null)}
              />
            )}
            <Typography
              variant="caption"
              sx={{
                color: themedColors.textTertiary,
                ml: "auto",
                alignSelf: "center",
              }}
            >
              {t("browser.resultCount", {
                shown: filteredMembers.length,
                total: totalMembers,
              })}
            </Typography>
          </Stack>

          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", md: "center" }}
          >
            {districts.length > 0 && (
              <Select
                size="small"
                displayEmpty
                value={districtFilter ?? ""}
                onChange={(event) =>
                  setDistrictFilter(event.target.value || null)
                }
                sx={{ minWidth: 200 }}
              >
                <MenuItem value="">{t("browser.district.all")}</MenuItem>
                {districts.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            )}

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ flex: 1, minWidth: 180 }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: themedColors.textSecondary,
                  whiteSpace: "nowrap",
                }}
              >
                {t("browser.ageRange")}
              </Typography>
              <Slider
                size="small"
                value={ageRange ?? [ageMin, ageMax]}
                min={ageMin}
                max={ageMax}
                onChange={(_, value) => setAgeRange(value as [number, number])}
                onChangeCommitted={(_, value) => {
                  const [lo, hi] = value as [number, number];
                  if (lo === ageMin && hi === ageMax) {
                    setAgeRange(null);
                  }
                }}
                valueLabelDisplay="auto"
                valueLabelFormat={(v) =>
                  `${v} ${t("browser.age", { value: v }).replace(String(v), "").trim() || "v"}`
                }
                sx={{ color: themedColors.primary }}
              />
              {ageRange && (
                <Chip
                  size="small"
                  label={`${ageRange[0]}–${ageRange[1]} v`}
                  onDelete={() => setAgeRange(null)}
                />
              )}
            </Stack>
          </Stack>
        </Stack>

        {filteredMembers.length === 0 ? (
          <EmptyState
            title={t("noResults")}
            description={t("noResultsHint")}
            action={
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setCompositionSearch("");
                  setPartyFilter(null);
                  setGovFilter("all");
                  setGenderFilter("all");
                  setDistrictFilter(null);
                  setAgeRange(null);
                }}
              >
                {t("resetFilters")}
              </Button>
            }
          />
        ) : viewMode === "list" ? (
          <Stack spacing={0.5}>
            {filteredMembers.map((member) => {
              const isSelected =
                selectedRepresentative?.personId === member.person_id;
              const age = calculateAgeAtDate(member.birth_date, date);
              return (
                <CardActionArea
                  key={member.person_id}
                  onClick={() => onMemberClick(member)}
                  sx={{
                    borderRadius: 1,
                    border: `1px solid ${
                      isSelected
                        ? themedColors.primary
                        : themedColors.dataBorder
                    }`,
                    background: isSelected
                      ? `${themedColors.primary}08`
                      : themedColors.backgroundPaper,
                    px: 1,
                    py: 0.625,
                  }}
                >
                  <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={0.75}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", md: "center" }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography
                          variant="body2"
                          sx={{
                            color: themedColors.textPrimary,
                            fontWeight: 700,
                          }}
                        >
                          {member.first_name} {member.last_name}
                        </Typography>
                      </Stack>
                      <TraceRegistration
                        table="MemberOfParliament"
                        pkName="personId"
                        pkValue={String(member.person_id)}
                        label={`${member.first_name} ${member.last_name}`}
                      />
                      <Typography
                        variant="body2"
                        sx={{ color: themedColors.textSecondary }}
                      >
                        {member.party_name || t("details.unknownParty")} ·{" "}
                        {member.profession || t("browser.unknownProfession")}
                        {member.district_name
                          ? ` · ${member.district_name}`
                          : ""}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      useFlexGap
                    >
                      <Chip
                        size="small"
                        label={t("browser.age", { value: age })}
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        size="small"
                        label={t("browser.tenure", {
                          value: formatFinnishDate(
                            getMemberStartDate(member) || date,
                          ),
                        })}
                        sx={{ fontWeight: 600 }}
                      />
                      <Chip
                        size="small"
                        label={
                          member.is_in_government === 1
                            ? t("details.filters.government")
                            : t("details.filters.opposition")
                        }
                        sx={{
                          fontWeight: 700,
                          bgcolor:
                            member.is_in_government === 1
                              ? `${colors.success}12`
                              : `${colors.warning}12`,
                          color:
                            member.is_in_government === 1
                              ? colors.success
                              : colors.warning,
                        }}
                      />
                    </Stack>
                  </Stack>
                </CardActionArea>
              );
            })}
          </Stack>
        ) : (
          <TableContainer
            component={Paper}
            elevation={0}
            sx={{
              border: `1px solid ${themedColors.dataBorder}`,
              borderRadius: 1,
              overflow: "hidden",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={commonStyles.tableHeaderRow}>
                  <TableCell>{t("table.name")}</TableCell>
                  <TableCell>{t("table.party")}</TableCell>
                  <TableCell>{t("table.government")}</TableCell>
                  <TableCell>{t("browser.ageColumn")}</TableCell>
                  <TableCell>{t("table.district")}</TableCell>
                  <TableCell>{t("table.occupation")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMembers.map((member) => (
                  <TableRow
                    key={member.person_id}
                    hover
                    onClick={() => onMemberClick(member)}
                    sx={{
                      cursor: "pointer",
                      "&:last-child td": { borderBottom: 0 },
                      ...(selectedRepresentative?.personId === member.person_id
                        ? { bgcolor: `${themedColors.primary}08` }
                        : null),
                    }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography sx={{ fontWeight: 700 }}>
                          {member.first_name} {member.last_name}
                        </Typography>
                      </Stack>
                      <TraceRegistration
                        table="MemberOfParliament"
                        pkName="personId"
                        pkValue={String(member.person_id)}
                        label={`${member.first_name} ${member.last_name}`}
                      />
                    </TableCell>
                    <TableCell>{member.party_name || "-"}</TableCell>
                    <TableCell>
                      {member.is_in_government === 1
                        ? t("details.filters.government")
                        : t("details.filters.opposition")}
                    </TableCell>
                    <TableCell>
                      {calculateAgeAtDate(member.birth_date, date)}
                    </TableCell>
                    <TableCell>{member.district_name || "-"}</TableCell>
                    <TableCell>{member.profession || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};
