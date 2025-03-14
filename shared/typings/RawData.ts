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
      AanestysMitatoity: StringifiedBoolean;
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
    [TableName.VaskiData]: {
      Id: StringifiedNumber;
      AttachmentGroupId: StringifiedNumber;
      Created: StringifiedDate;
      Eduskuntatunnus: string;
      Imported: StringifiedDate;
      Status: DataStatus;
      XmlData: string;
    };
  }

  export type RawDataModel<T extends Modules.Common.TableName> =
    T extends keyof RawDataModels ? RawDataModels[T] : Record<string, unknown>;
}
