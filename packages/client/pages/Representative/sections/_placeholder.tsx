import { Skeleton, Stack } from "@mui/material";
import React from "react";
import { SectionShell } from "../components/SectionShell";

interface PlaceholderProps {
  anchor: string;
  title: string;
  methodology: string;
  pendingMessage?: string;
}

/**
 * Phase 2 placeholder. Renders a SectionShell with skeleton bars so the
 * single-spine layout has visual rhythm before real content lands in
 * later phases.
 */
export const SectionPlaceholder: React.FC<PlaceholderProps> = ({
  anchor,
  title,
  methodology,
  pendingMessage,
}) => (
  <SectionShell
    anchor={anchor}
    title={title}
    methodology={methodology}
    subtitle={pendingMessage ?? "Sisältö siirretään seuraavassa vaiheessa."}
  >
    <Stack spacing={1.25}>
      <Skeleton variant="rectangular" height={18} width="65%" />
      <Skeleton variant="rectangular" height={18} width="85%" />
      <Skeleton variant="rectangular" height={18} width="50%" />
    </Stack>
  </SectionShell>
);
