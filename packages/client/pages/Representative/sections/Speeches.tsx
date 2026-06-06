import { Skeleton } from "@mui/material";
import React from "react";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

const SpeechesTab = React.lazy(() =>
  import("../../Composition/Details").then((m) => ({ default: m.SpeechesTab })),
);

const Speeches: React.FC<ProfileSectionProps> = ({ personId, scope }) => (
  <SectionShell
    anchor="puheenvuorot"
    title="Puheenvuorot"
    methodology="Puheenvuorot ovat täysistunnon pöytäkirjoista poimittuja edustajan käyttämiä puheenvuoroja. Aikajana yhdistää puheen ja samaan asiakohtaan liittyvät äänestykset."
  >
    <React.Suspense fallback={<Skeleton variant="rectangular" height={240} />}>
      <SpeechesTab personId={personId} scope={scope} />
    </React.Suspense>
  </SectionShell>
);

export default Speeches;
