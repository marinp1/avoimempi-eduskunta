import type React from "react";
import { SectionPlaceholder } from "./_placeholder";
import type { ProfileSectionProps } from "./registry";

const Vaalikone: React.FC<ProfileSectionProps> = () => (
  <SectionPlaceholder
    anchor="vaalikone"
    title="Vaalikoneen vastaukset"
    methodology="Vaalikoneen vastaukset tuodaan ulkoisilta julkaisijoilta (esimerkiksi Yle, Helsingin Sanomat). Tiedot ryhmitellään vaalivuoden ja julkaisijan mukaan."
    pendingMessage="Vaalikoneen vastausten lähteitä ei ole vielä kytketty."
  />
);

export default Vaalikone;
