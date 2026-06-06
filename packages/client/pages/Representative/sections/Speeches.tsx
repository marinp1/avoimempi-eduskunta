import React from "react";
import { SpeechesTab } from "../../Composition/Details";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

const Speeches: React.FC<ProfileSectionProps> = ({ personId, scope }) => (
  <SectionShell
    anchor="puheenvuorot"
    title="Puheenvuorot"
    methodology="Puheenvuorot ovat täysistunnon pöytäkirjoista poimittuja edustajan käyttämiä puheenvuoroja. Aikajana yhdistää puheen ja samaan asiakohtaan liittyvät äänestykset."
  >
    <SpeechesTab personId={personId} scope={scope} />
  </SectionShell>
);

export default Speeches;
