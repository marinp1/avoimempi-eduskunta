import { TableName } from "#constants/index";

type StringifiedNumber = string;
type StringifiedDate = string;
type StringifiedBoolean = "1" | "0";

type DataStatus = string;

declare global {
  interface RawDataModels {
    [TableName.MemberOfParliament]: {
      personId: StringifiedNumber;
      XmlData: string;
      XmlDataEn: string;
      XmlDataFi: string;
      XmlDataSv: string;
      firstname: string;
      lastname: string;
      minister: string;
      party: string;
    };
    [TableName.SaliDBAanestys]: {
      AanestysId: StringifiedNumber;
      AanestysAlkuaika: string;
      AanestysLisaOtsikko: string;
      AanestysLoppuaika: string;
      AanestysMitatoitu: StringifiedBoolean;
      AanestysNumero: StringifiedNumber;
      AanestysOtsikko: string;
      AanestysPoytakirja: string;
      AanestysPoytakirjaUrl: string;
      AanestysTulosEi: StringifiedNumber;
      AanestysTulosJaa: StringifiedNumber;
      AanestysTulosPoissa: StringifiedNumber;
      AanestysTulosTyhjia: StringifiedNumber;
      AanestysTulosYhteensa: StringifiedNumber;
      AanestysValtiopaivaasia: string;
      AanestysValtiopaivaasiaUrl: string;
      AliKohtaTunniste: string;
      Imported: StringifiedDate;
      IstuntoAlkuaika: StringifiedDate;
      IstuntoIlmoitettuAlkuaika: StringifiedDate;
      IstuntoNumero: StringifiedNumber;
      IstuntoPvm: StringifiedDate;
      IstuntoVPVuosi: StringifiedNumber;
      KieliId: Modules.Common.LanguageId;
      KohtaHuomautus: string;
      KohtaJarjestys: StringifiedNumber;
      KohtaKasittelyOtsikko: string;
      KohtaKasittelyVaihe: string;
      KohtaOtsikko: string;
      KohtaTunniste: StringifiedNumber;
      PJOtsikko: string;
      PaaKohtaHuomautus: string;
      PaaKohtaOtsikko: string;
      PaaKohtaTunniste: string;
      Url: string;
    };
    [TableName.SaliDBAanestysAsiakirja]: {
      AsiakirjaId: StringifiedNumber;
      AanestysId: StringifiedNumber;
      Asiakirja: string;
      AsiakirjaUrl: string;
      Imported: StringifiedDate;
    };
    [TableName.SaliDBAanestysEdustaja]: {
      EdustajaId: StringifiedNumber;
      AanestysId: StringifiedNumber;
      EdustajaAanestys: Modules.Common.VoteResult;
      EdustajaEtunimi: string;
      EdustajaHenkiloNumero: StringifiedNumber;
      EdustajaRyhmaLyhenne: string;
      EdustajaSukunimi: string;
      Imported: StringifiedDate;
    };
    [TableName.SaliDBAanestysJakauma]: {
      JakaumaId: StringifiedNumber;
      AanestysId: StringifiedNumber;
      Ryhma: string;
      Jaa: StringifiedNumber;
      Ei: StringifiedNumber;
      Tyhjia: StringifiedNumber;
      Poissa: StringifiedNumber;
      Yhteensa: StringifiedNumber;
      Tyyppi: string;
      Imported: StringifiedDate;
    };
    [TableName.VaskiData]: {
      Id: StringifiedNumber;
      AttachmentGroupId: StringifiedNumber;
      Created: StringifiedDate;
      Eduskuntatunnus: string;
      Imported: StringifiedDate;
      Status: DataStatus;
      XmlData: string;
    };
    [TableName.SaliDBIstunto]: {
      Id: StringifiedNumber;
      AttachmentGroupId: string;
      Created: StringifiedDate;
      Imported: StringifiedDate;
      IstuntoAlkuaika: StringifiedDate;
      IstuntoIlmoitettuAlkuaika: StringifiedDate;
      IstuntoLoppuaika: StringifiedDate | null;
      IstuntoNimenhuutoaika: StringifiedDate | null;
      IstuntoNumero: StringifiedNumber;
      IstuntoPvm: StringifiedDate;
      IstuntoTila: string;
      IstuntoTilaSeliteFI: string;
      IstuntoTilaSeliteSV: string;
      IstuntoTyyppi: string;
      IstuntoVPVuosi: StringifiedNumber;
      KasiteltavaKohtaTekninenAvain: string;
      ManuaalinenEsto: StringifiedBoolean;
      Modified: StringifiedDate;
      PJOtsikkoFI: string;
      PJOtsikkoSV: string;
      PJTekninenAvain: string;
      PJTila: string;
      PuhujaHenkilonumero: StringifiedNumber;
      TekninenAvain: string;
      XmlData: string | null;
    };
    [TableName.SaliDBKohta]: {
      Id: StringifiedNumber;
      Created: StringifiedDate;
      HuomautuSV: string;
      HuomautusFI: string;
      Imported: StringifiedDate;
      IstuntoTekninenAvain: string;
      Jarjestysnumero: StringifiedNumber;
      KasittelyotsikkoFI: string;
      KasittelyotsikkoSV: string;
      Modified: StringifiedDate;
      OtsikkoFI: string;
      OtsikkoSV: string;
      PJKohtaTunnus: string;
      PaatosFI: string;
      PaatosSV: string;
      PuheenvuoroTyyppiOletus: string;
      TekninenAvain: string;
      Tunniste: string;
      VaskiID: StringifiedNumber;
      VoikoPyytaaPV: StringifiedBoolean;
      XmlData: string;
    };
    [TableName.SaliDBKohtaAsiakirja]: {
      Id: StringifiedNumber;
      KohtaTekninenAvain: string;
      TekninenAvain: string;
      NimiFI: string;
      LinkkiTekstiFI: string;
      LinkkiUrlFI: string;
      NimiSV: string;
      LinkkiTekstiSV: string;
      LinkkiUrlSV: string;
      Created: StringifiedDate;
      Modified: StringifiedDate;
      Imported: StringifiedDate;
    };
    [TableName.SaliDBKohtaAanestys]: {
      Id: StringifiedNumber;
      Aanestysnumero: StringifiedNumber;
      Created: StringifiedDate;
      Imported: StringifiedDate;
      IstuntoTekninenAvain: string;
      KohtaTekninenAvain: string;
      Modified: StringifiedDate;
    };
    [TableName.SaliDBPuheenvuoro]: {
      Id: StringifiedNumber;
      IstuntoTekninenAvain: string;
      KohtaTekninenAvain: string;
      TekninenAvain: string;
      Jarjestys: StringifiedDate;
      PVTyyppi: string;
      henkilonumero: StringifiedNumber;
      Etunimi: string;
      Sukunimi: string;
      Sukupuoli: string;
      PyyntoTapa: string;
      PyyntoAika: StringifiedDate;
      XmlData: string;
      Created: StringifiedDate;
      Modified: StringifiedDate;
      RyhmaLyhenneFI: string;
      RyhmaLyhenneSV: string;
      Puhunut: StringifiedBoolean;
      JarjestysNro: StringifiedNumber;
      ADtunnus: string;
      MinisteriysFI: string;
      MinisteriysSV: string;
      Imported: StringifiedDate;
    };
    [TableName.SaliDBTiedote]: {
      Id: StringifiedNumber;
      TekninenAvain: string;
      IstuntoTekninenAvain: string;
      KohtaTekninenAvain: string | null;
      TiedoteTyyppi: string;
      TiedoteTekstiFI: string;
      TiedoteTekstiSV: string | null;
      TiedoteVoimassaolo: StringifiedDate | null;
      TiedoteLahetetty: StringifiedDate | null;
      Created: StringifiedDate;
      Modified: StringifiedDate;
      Imported: StringifiedDate;
    };
  }

  export type RawDataModel<T extends Modules.Common.TableName> =
    T extends keyof RawDataModels ? RawDataModels[T] : Record<string, unknown>;
}
