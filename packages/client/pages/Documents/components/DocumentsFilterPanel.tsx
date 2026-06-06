import {
  ExpandMore as ExpandMoreIcon,
  Tune as TuneIcon,
} from "@mui/icons-material";
import { Badge, Box, Button, Collapse, Stack } from "@mui/material";
import React, { useState } from "react";
import { FilterBar } from "#client/theme/components";

const DocumentsFilterPanelComponent: React.FC<{
  children: React.ReactNode;
  secondaryFilters?: React.ReactNode;
  collapsible?: boolean;
  sticky?: boolean;
}> = ({ children, secondaryFilters, collapsible = false, sticky = false }) => {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasSecondary = Boolean(secondaryFilters);

  const filterContent = (
    <Stack spacing={1.5}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 2fr) minmax(180px, 1fr)",
          },
          gap: 1,
          alignItems: "start",
        }}
      >
        {children}
      </Box>

      {secondaryFilters && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(auto-fit, minmax(200px, 1fr))",
            },
            gap: 1,
          }}
        >
          {secondaryFilters}
        </Box>
      )}
    </Stack>
  );

  return (
    <FilterBar
      icon={<TuneIcon sx={{ fontSize: 18 }} />}
      sticky={sticky}
      sx={{
        mb: 0,
      }}
    >
      {collapsible ? (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: filtersOpen ? 1.5 : 0,
            }}
          >
            <Badge
              badgeContent={hasSecondary ? 1 : 0}
              color="primary"
              variant="dot"
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() => setFiltersOpen((prev) => !prev)}
                endIcon={
                  <ExpandMoreIcon
                    sx={{
                      transform: filtersOpen ? "rotate(180deg)" : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                }
              >
                Suodattimet
              </Button>
            </Badge>
          </Box>
          <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
            {filterContent}
          </Collapse>
        </>
      ) : (
        filterContent
      )}
    </FilterBar>
  );
};

export const DocumentsFilterPanel = React.memo(DocumentsFilterPanelComponent);
