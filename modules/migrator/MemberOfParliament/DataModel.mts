export namespace DataModel {
  export interface Representative {
    personId: string;
    lastname: string;
    firstname: string;
    party: string;
    minister: string;
    XmlData: null;
    XmlDataSv: null;
    XmlDataFi: {
      Henkilo: {
        KotiSivu?: string;
        EdustajatoimiKeskeytynyt?: {
          ToimenKeskeytys: Interruption | Interruption[];
        };
        EdustajantoimenTila?: string;
        KirjallisuuttaEdustajasta?: {
          Julkaisu: Publication | Publication[];
        };
        Puh?: string;
        SahkoPosti?: string;
        NykyinenKotikunta: string;
        NykyisetToimielinjasenyydet?: {
          Toimielin: Committee | Committee[];
        };
        Sidonnaisuudet: {
          Sidonnaisuus: {
            Otsikko: string;
            RyhmaOtsikko: string;
            Sidonta: string;
          }[];
        };
        LisaTiedot: string;
        Kansanedustajana: {
          Keskeytys: Interruption | Interruption[];
        };
        ValtioneuvostonJasenyydet?: {
          Jasenyys: GovernmentMembership | GovernmentMembership[];
        };
        Sotilasarvo: string;
        KansanvalisetLuottamustehtavat?: {
          Tehtava: TrustPosition | TrustPosition[];
        };
        EdustajanJulkaisut?: {
          EdustajanJulkaisu: Publication | Publication[];
        };
        MuutLuottamustehtavat?: {
          Tehtava: TrustPosition | TrustPosition[];
        };
        HenkiloNro: string;
        EtunimetNimi: string;
        SukuNimi: string;
        LajitteluNimi: string;
        KutsumaNimi: string;
        MatrikkeliNimi: string;
        Ammatti: string;
        SyntymaPvm: string;
        SyntymaPaikka: string;
        KuolemaPvm?: string;
        KuolemaPaikka?: string;
        SukuPuoliKoodi: string;
        KansanedustajuusPaattynytPvm?: string;
        Koulutukset: {
          Koulutus: Koulutus | Koulutus[];
        };
        TyoUra: {
          Tyo: Work | Work[];
        };
        Arvonimet: {
          Arvonimi: Title | Title[];
        };
        Vaalipiirit: {
          NykyinenVaalipiiri: District;
          EdellisetVaalipiirit?: {
            VaaliPiiri: District | District[];
          };
        };
        Edustajatoimet: {
          Edustajatoimi: Term | Term[];
        };
        Eduskuntaryhmat: {
          TehtavatEduskuntaryhmassa?: {
            Eduskuntaryhma: ParliamentGroupStub | ParliamentGroupStub[];
          };
          NykyinenEduskuntaryhma?: ParliamentGroup;
          TehtavatAiemmissaEduskuntaryhmissa?: {
            Eduskuntaryhma: ParliamentGroupStub | ParliamentGroupStub[];
          };
          EdellisetEduskuntaryhmat?: {
            Eduskuntaryhma: ParliamentGroup | ParliamentGroup[];
          };
        };
        AiemmatToimielinjasenyydet?: {
          Toimielin: Committee | Committee[];
        };
        ValtiollisetLuottamustehtavat?: {
          Tehtava: TrustPosition | TrustPosition[];
        };
        KunnallisetLuottamustehtavat?: {
          Tehtava: TrustPosition | TrustPosition[];
        };
      };
    };
    XmlDataEn: null;
  }
  export interface Interruption {
    Selite: string;
    TilallaHenkilo: string;
    AlkuPvm: string;
    LoppuPvm: string;
    TilallaSelite: string;
  }
  export interface Publication {
    Nimi: string;
    Vuosi: string;
    Tekijat: string;
  }
  export interface Committee {
    Nimi: string;
    Tunnus: string;
    Jasenyys: CommitteeMembership | CommitteeMembership[];
    EntNimi: PreviousName | PreviousName[];
  }
  export interface CommitteeMembership {
    AikaJakso: string;
    Rooli: string;
    AlkuPvm: string;
    LoppuPvm: string;
  }
  export interface PreviousName {
    Nimi: string;
    LoppuPvm: string;
    AlkuPvm: string;
  }
  export interface GovernmentMembership {
    Ministeriys: string;
    Nimi: string;
    Hallitus: string;
    AlkuPvm: string;
    LoppuPvm: string;
  }
  export interface TrustPosition {
    Nimi: string;
    AikaJakso: string;
  }
  export interface Koulutus {
    Nimi: string;
    Oppilaitos: string;
    Vuosi: string;
  }
  export interface Work {
    Nimi: string;
    AikaJakso: string;
  }
  export interface Title {
    Oppilaitos: string;
    Nimi: string;
    Vuosi: string;
  }
  export interface District {
    Nimi: string;
    AlkuPvm: string;
    LoppuPvm: string;
    Tunnus: string;
  }
  export interface Term {
    AlkuPvm: string;
    LoppuPvm: string;
  }

  export interface ParliamentGroup {
    Nimi: string;
    Tunnus: string;
    AlkuPvm: string;
    Jasenyys: ParliamentGroupMembership | ParliamentGroupMembership[];
    EntNimi: PreviousName | PreviousName[];
  }

  export interface ParliamentGroupStub {
    Nimi: string;
    Tunnus: string;
    Tehtava: ParliamentGroupAssignment | ParliamentGroupAssignment[];
    ToimielinNimi: string;
    ToimielinTunnus: string;
    EntNimi: PreviousName | PreviousName[];
  }

  export interface ParliamentGroupAssignment {
    Rooli: string;
    AlkuPvm: string;
    LoppuPvm: string;
    AikaJakso: string;
  }

  export interface ParliamentGroupMembership {
    AlkuPvm: string;
    LoppuPvm: string;
  }
}
