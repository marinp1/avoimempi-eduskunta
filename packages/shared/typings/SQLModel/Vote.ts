declare global {
  export namespace DatabaseTables {
    export type Vote = {
      id: number; // unique
      voting_id: number; // Voting.id
      person_id: number; // Representative.person_id
      vote: string;
      group_abbreviation: string;
    };
  }
}

export {};
