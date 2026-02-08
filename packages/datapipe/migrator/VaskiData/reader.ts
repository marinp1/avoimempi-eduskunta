export interface VaskiEntry {
  id: string;
  eduskuntaTunnus: string;
  status: string;
  created: string;
  attachmentGroupId: string | null;
  contents: {
    Siirto: {
      Sanomavalitys?: Record<string, any>;
      SiirtoMetatieto?: Record<string, any>;
      SiirtoAsiakirja?: Record<string, any>;
      SiirtoTiedosto?: Record<string, any>;
    };
  };
}
