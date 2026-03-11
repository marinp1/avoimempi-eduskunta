import { describe, expect, test } from "bun:test";
import {
  buildCompositionUrl,
  buildPartySummaries,
  getActivationDateForSearchResult,
} from "../pages/Composition/helpers";

describe("composition helpers", () => {
  test("buildCompositionUrl preserves unrelated params while updating composition state", () => {
    expect(
      buildCompositionUrl("/edustajat", "?hallituskausi=123&person=10", {
        person: "20",
        q: "meikalainen",
        view: "table",
      }),
    ).toBe("/edustajat?hallituskausi=123&person=20&q=meikalainen&view=table");
  });

  test("getActivationDateForSearchResult prefers latest active date for historical representative", () => {
    expect(
      getActivationDateForSearchResult(
        {
          person_id: 1000,
          first_name: "Matti",
          last_name: "Meikäläinen",
          sort_name: "Meikäläinen Matti",
          birth_date: "1970-01-01",
          death_date: null,
          profession: null,
          latest_party_name: "Keskustan eduskuntaryhmä",
          first_term_start: "2011-04-01",
          last_term_end: "2015-04-21",
          latest_active_date: "2015-04-21",
          is_current_mp: 0,
          is_active_on_selected_date: 0,
        },
        "2026-03-10",
      ),
    ).toBe("2015-04-21");
  });

  test("buildPartySummaries aggregates coalition and opposition counts", () => {
    const parties = buildPartySummaries([
      {
        person_id: 1,
        first_name: "A",
        last_name: "A",
        sort_name: "A A",
        gender: "Nainen",
        birth_date: "1980-01-01",
        death_date: null,
        birth_place: "Helsinki",
        death_place: "",
        profession: "Opettaja",
        start_date: "2023-04-01",
        end_date: "",
        party_name: "SDP",
        is_in_government: 1,
      },
      {
        person_id: 2,
        first_name: "B",
        last_name: "B",
        sort_name: "B B",
        gender: "Mies",
        birth_date: "1981-01-01",
        death_date: null,
        birth_place: "Turku",
        death_place: "",
        profession: "Toimittaja",
        start_date: "2023-04-01",
        end_date: "",
        party_name: "SDP",
        is_in_government: 1,
      },
      {
        person_id: 3,
        first_name: "C",
        last_name: "C",
        sort_name: "C C",
        gender: "Mies",
        birth_date: "1982-01-01",
        death_date: null,
        birth_place: "Oulu",
        death_place: "",
        profession: "Juristi",
        start_date: "2023-04-01",
        end_date: "",
        party_name: "PS",
        is_in_government: 0,
      },
    ]);

    expect(parties).toEqual([
      expect.objectContaining({
        partyName: "SDP",
        total: 2,
        government: 2,
        opposition: 0,
      }),
      expect.objectContaining({
        partyName: "PS",
        total: 1,
        government: 0,
        opposition: 1,
      }),
    ]);
  });
});
