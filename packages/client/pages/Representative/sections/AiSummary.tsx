import React from "react";
import { AiSummaryBlock } from "../components/annotations/AiSummaryBlock";
import { SectionShell } from "../components/SectionShell";
import type { ProfileSectionProps } from "./registry";

const AiSummary: React.FC<ProfileSectionProps> = ({ personId }) => (
  <SectionShell
    anchor="ai-tiivistelma"
    title="AI-tiivistelmä"
    methodology="Tiivistelmät tuotetaan kielimallilla edustajan puheenvuoroista, aloitteista ja kysymyksistä. Jokaisessa tiivistelmässä on merkittynä mallin nimi, versio ja luottamustaso."
    methodologyCaveats="Älä lue tiivistelmää tosiasiana. Käytä lähtötietoja päätöksenteon pohjana ja tarkista tiivistelmän väitteet itse."
  >
    <AiSummaryBlock personId={personId} />
  </SectionShell>
);

export default AiSummary;
