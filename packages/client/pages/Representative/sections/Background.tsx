import { Skeleton } from "@mui/material";
import React from "react";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

const OverviewTab = React.lazy(() =>
  import("../../Composition/Details").then((m) => ({ default: m.OverviewTab })),
);

const Background: React.FC<ProfileSectionProps> = ({
  details,
  selectedDate,
}) => (
  <SectionShell
    anchor="tausta"
    title="Tausta"
    methodology="Henkilötiedot, koulutus, työhistoria ja julkaisut tulevat suoraan eduskunnan avoimesta datasta."
  >
    {details ? (
      <React.Suspense
        fallback={<Skeleton variant="rectangular" height={200} />}
      >
        <OverviewTab details={details} selectedDate={selectedDate} />
      </React.Suspense>
    ) : (
      <Skeleton variant="rectangular" height={200} />
    )}
  </SectionShell>
);

export default Background;
