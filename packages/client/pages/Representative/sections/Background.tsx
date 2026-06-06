import { Skeleton } from "@mui/material";
import React from "react";
import { OverviewTab } from "../../Composition/Details";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

const Background: React.FC<ProfileSectionProps> = ({ details, selectedDate }) => (
  <SectionShell
    anchor="tausta"
    title="Tausta"
    methodology="Henkilötiedot, koulutus, työhistoria ja julkaisut tulevat suoraan eduskunnan avoimesta datasta."
  >
    {details ? (
      <OverviewTab details={details} selectedDate={selectedDate} />
    ) : (
      <Skeleton variant="rectangular" height={200} />
    )}
  </SectionShell>
);

export default Background;
