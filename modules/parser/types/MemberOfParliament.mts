export type RepresentativeData = {
  personId: string;
  lastname: string;
  firstname: string;
  party: string;
  minister: string;
  XmlData: unknown;
  XmlDataSv: unknown;
  XmlDataFi: XmlDataFi;
  XmlDataEn: unknown;
};

type XmlDataFi = {
  Henkilo: Henkilo;
};

type Henkilo = {
  HenkiloNro: string;
  EtunimetNimi: string;
  SukuNimi: string;
  LajitteluNimi: string;
  KutsumaNimi: string;
  MatrikkeliNimi: string;
  Puh: string | null;
  SahkoPosti: string | null;
  KotiSivu: string | null;
  Ammatti: string;
  SyntymaPvm: string;
  SyntymaPaikka: string;
  KuolemaPvm: string;
  KuolemaPaikka: string;
  SukuPuoliKoodi: string;
  NykyinenKotikunta: string | null;
  KansanedustajuusPaattynytPvm: string;
  Koulutukset: Koulutukset;
  TyoUra: TyoUra;
  Vanhemmat: unknown;
  Puolisot: unknown;
  Lapset: unknown;
  Arvonimet: Arvonimet;
  Sotilasarvo: unknown;
  AseetonpalvelusVuosi: unknown;
  SiviilipalvelusVuosi: unknown;
  Vaalipiirit: Vaalipiirit;
  Edustajatoimet: Edustajatoimet;
  Eduskuntaryhmat: Eduskuntaryhmat;
  NykyisetToimielinjasenyydet: NykyisetToimielinjasenyydet;
  AiemmatToimielinjasenyydet: AiemmatToimielinjasenyydet | null;
  ValtiollisetLuottamustehtavat: ValtiollisetLuottamustehtavat;
  KansanvalisetLuottamustehtavat: KansanvalisetLuottamustehtavat;
  KunnallisetLuottamustehtavat: KunnallisetLuottamustehtavat;
  MuutLuottamustehtavat: MuutLuottamustehtavat;
  ValtioneuvostonJasenyydet: ValtioneuvostonJasenyydet;
  Sidonnaisuudet: Sidonnaisuudet;
  LisaTiedot: unknown;
  EdustajanJulkaisut: EdustajanJulkaisut;
  KirjallisuuttaEdustajasta: KirjallisuuttaEdustajasta;
  EdustajatoimiKeskeytynyt: EdustajatoimiKeskeytynyt;
  Kansanedustajana: Kansanedustajana;
};

type Koulutukset = {
  Koulutus: Koulutus | Koulutus[];
};

type Koulutus = {
  Nimi: string;
  Oppilaitos: string | null;
  Vuosi: string;
};

type TyoUra = {
  Tyo: Tyo | Tyo[];
};

type Tyo = {
  Nimi: string;
  AikaJakso: string | null;
};

type Arvonimet = {
  Arvonimi: Arvonimi;
};

type Arvonimi = {
  Nimi: string;
  Oppilaitos: string | null;
  Vuosi: string | null;
  LisaTieto: string | null;
};

type Vaalipiirit = {
  NykyinenVaalipiiri: Vaalipiiri | null;
  EdellisetVaalipiirit: EdellisetVaalipiirit;
};

type Vaalipiiri = {
  Nimi: string | null;
  AlkuPvm: string | null;
  Tunnus: string | null;
};

type EdellisetVaalipiirit = {
  VaaliPiiri: VaaliPiiri | VaaliPiiri[];
};

type VaaliPiiri = {
  Nimi: string;
  AlkuPvm: string;
  LoppuPvm: string;
  Tunnus: string;
};

type Edustajatoimet = {
  Edustajatoimi: Edustajatoimi | Edustajatoimi[];
};

type Edustajatoimi = {
  AlkuPvm: string;
  LoppuPvm: string;
};

type Eduskuntaryhmat = {
  NykyinenEduskuntaryhma?: NykyinenEduskuntaryhma;
  EdellisetEduskuntaryhmat: EdellisetEduskuntaryhmat | null;
  TehtavatEduskuntaryhmassa: TehtavatEduskuntaryhmassa;
  TehtavatAiemmissaEduskuntaryhmissa: TehtavatAiemmissaEduskuntaryhmissa;
};

type NykyinenEduskuntaryhma = {
  Nimi: string | null;
  EntNimi: EntNimi | null;
  Tunnus: string | null;
  AlkuPvm: string | null;
};

type EntNimi = {
  Nimi: string | null;
  AlkuPvm: string | null;
  LoppuPvm: string | null;
};

type EdellisetEduskuntaryhmat = {
  Eduskuntaryhma: Eduskuntaryhma | Eduskuntaryhma[];
};

type Eduskuntaryhma = {
  Nimi: string;
  EntNimi: EntNimi | null;
  Tunnus: string | null;
  Jasenyys?: Jasenyys | Jasenyys[];
};

type Jasenyys = {
  AlkuPvm: string;
  LoppuPvm: string;
  AikaJakso: string | null;
};

type TehtavatEduskuntaryhmassa = {
  Eduskuntaryhma: EduskuntaryhmaDetails;
};

type TehtavatAiemmissaEduskuntaryhmissa = {
  Eduskuntaryhma: EduskuntaryhmaDetails;
};

type EduskuntaryhmaDetails = {
  Nimi: string | null;
  EntNimi: EntNimi | null;
  Tunnus: string | null;
  ToimielinNimi: string | null;
  ToimielinTunnus: string | null;
  Tehtava: Tehtava | null;
};

type Tehtava = {
  Rooli: string | null;
  AlkuPvm: string | null;
  LoppuPvm: string | null;
  AikaJakso: string | null;
};

type NykyisetToimielinjasenyydet = {
  Toimielin: ToimielinDetails | ToimielinDetails[];
};

type AiemmatToimielinjasenyydet = {
  Toimielin: ToimielinDetails | ToimielinDetails[];
};

type ToimielinDetails = {
  Nimi: string;
  EntNimi: EntNimi | null;
  Tunnus: string;
  Jasenyys: JasenyysDetails | null;
};

type JasenyysDetails = {
  Rooli: string;
  AlkuPvm: string;
  LoppuPvm: string;
  AikaJakso: string;
};

type ValtiollisetLuottamustehtavat = {
  Tehtava: TehtavaDetails;
};

type TehtavaDetails = {
  Nimi: string;
  AikaJakso: string;
};

type KansanvalisetLuottamustehtavat = {
  Tehtava: TehtavaDetails | null;
};

type KunnallisetLuottamustehtavat = {
  Tehtava: TehtavaDetails | null;
};

type MuutLuottamustehtavat = {
  Tehtava: TehtavaDetails | null;
};

type ValtioneuvostonJasenyydet = {
  Jasenyys: JasenyysDetails;
};

type Sidonnaisuudet = {
  Sidonnaisuus: Sidonnaisuus;
};

type Sidonnaisuus = {
  Sidonta: string | null;
  Otsikko: string | null;
  RyhmaOtsikko: string | null;
};

type EdustajanJulkaisut = {
  EdustajanJulkaisu: Julkaisu;
};

type KirjallisuuttaEdustajasta = {
  Julkaisu: Julkaisu;
};

type Julkaisu = {
  Nimi: string | null;
  Vuosi: string | null;
  Tekijat: string | null;
};

type EdustajatoimiKeskeytynyt = {
  ToimenKeskeytys: Keskeytys;
};

type Keskeytys = {
  Selite: string | null;
  TilallaHenkilo: string | null;
  AlkuPvm: string | null;
  LoppuPvm: string | null;
};

type Kansanedustajana = {
  Keskeytys: KeskeytysDetails;
};

type KeskeytysDetails = {
  Selite: string | null;
  TilallaSelite: string | null;
  TilallaHenkilo: string | null;
  AlkuPvm: string;
  LoppuPvm: string;
};
