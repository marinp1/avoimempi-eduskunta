export interface PartyRow {
  code: string;
  name: string;
  shortName: string;
  color: string;
  bloc: "government" | "opposition";
  chairName: string | null;
  seatCount: number;
  seatShare: string;
  cohesionPct: number | null;
  cohesionLabel: string;
}

export interface PuolueetData {
  rows: PartyRow[];
  govSeats: number;
  oppSeats: number;
  totalSeats: number;
  fetchedAt: string;
}
