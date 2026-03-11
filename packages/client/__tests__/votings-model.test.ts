import { describe, expect, test } from "bun:test";
import {
  buildVotingViewModels,
  getNextVisibleGroupCount,
  groupVotingViewModels,
  hasMoreGroups,
  sortRows,
  type VotingListRow,
} from "../pages/Votings/model";

const createVotingRow = (overrides: Partial<VotingListRow>): VotingListRow =>
  ({
    id: 1,
    number: 1,
    start_time: "2024-01-01T10:00:00",
    start_date: "2024-01-01",
    end_time: null,
    annulled: false,
    title: "Lakialoite LA 1/2024 vp",
    title_extra: null,
    proceedings_name: "",
    proceedings_url: "",
    result_url: "",
    parliamentary_item: "LA 1/2024 vp",
    parliamentary_item_url: null,
    n_yes: 101,
    n_no: 99,
    n_abstain: 0,
    n_absent: 0,
    n_total: 200,
    language_id: null,
    section_note: null,
    section_order: null,
    section_processing_title: "Ensimmäinen käsittely",
    section_processing_phase: "Ensimmäinen käsittely",
    modified_datetime: null,
    imported_datetime: null,
    section_title: "Lakialoite LA 1/2024 vp",
    main_section_note: null,
    main_section_title: null,
    sub_section_identifier: null,
    agenda_title: null,
    section_id: 1,
    section_key: "2024/1/1",
    main_section_id: 1,
    session_key: "1/2024",
    context_title: "Lakialoite LA 1/2024 vp",
    ...overrides,
  }) as VotingListRow;

describe("votings model", () => {
  test("buildVotingViewModels computes stable derived fields once", () => {
    const [viewModel] = buildVotingViewModels([
      createVotingRow({ n_yes: 102, n_no: 98 }),
    ]);

    expect(viewModel.margin).toBe(4);
    expect(viewModel.passed).toBe(true);
    expect(viewModel.close).toBe(true);
    expect(viewModel.primary_title).toBe("Lakialoite LA 1/2024 vp");
    expect(viewModel.group_key).toBe("LA 1/2024 vp");
    expect(viewModel.document_refs).toHaveLength(1);
  });

  test("groupVotingViewModels keeps document-linked votes together with stable ids", () => {
    const rows = buildVotingViewModels([
      createVotingRow({ id: 1, parliamentary_item: "HE 1/2024 vp" }),
      createVotingRow({
        id: 2,
        parliamentary_item: "HE 1/2024 vp",
        start_time: "2024-01-01T11:00:00",
      }),
      createVotingRow({
        id: 3,
        parliamentary_item: null,
        title: "Irrallinen äänestys",
        context_title: "Irrallinen äänestys",
        section_title: "Irrallinen äänestys",
      }),
    ]);

    const groups = groupVotingViewModels(rows);

    expect(groups).toHaveLength(2);
    expect(groups[0].id).toBe("HE 1/2024 vp");
    expect(groups[0].votes).toHaveLength(2);
    expect(groups[1].id).toBe("single:3");
  });

  test("sortRows preserves expected ordering modes", () => {
    const rows = [
      createVotingRow({
        id: 1,
        start_time: "2024-01-02T10:00:00",
        n_total: 150,
      }),
      createVotingRow({
        id: 2,
        start_time: "2024-01-01T10:00:00",
        n_yes: 100,
        n_no: 99,
        n_total: 200,
      }),
      createVotingRow({
        id: 3,
        start_time: "2024-01-03T10:00:00",
        n_total: 180,
      }),
    ];

    expect(sortRows(rows, "newest").map((row) => row.id)).toEqual([3, 1, 2]);
    expect(sortRows(rows, "oldest").map((row) => row.id)).toEqual([2, 1, 3]);
    expect(sortRows(rows, "largest").map((row) => row.id)).toEqual([2, 3, 1]);
    expect(sortRows(rows, "closest").map((row) => row.id)[0]).toBe(2);
  });

  test("group visibility helpers advance in fixed increments", () => {
    expect(hasMoreGroups([1, 2, 3], 2)).toBe(true);
    expect(hasMoreGroups([1, 2, 3], 3)).toBe(false);
    expect(getNextVisibleGroupCount(24, 80, 24)).toBe(48);
    expect(getNextVisibleGroupCount(72, 80, 24)).toBe(80);
  });
});
