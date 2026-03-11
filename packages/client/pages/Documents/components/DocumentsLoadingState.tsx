import { Box, Skeleton, Stack } from "@mui/material";
import type React from "react";

export const DocumentsLoadingState: React.FC = () => (
  <Stack spacing={2}>
    {Array.from({ length: 4 }).map((_, index) => (
      <Box
        key={index}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Skeleton variant="rounded" height={224} animation="wave" />
      </Box>
    ))}
  </Stack>
);
