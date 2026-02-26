import type { Database } from "bun:sqlite";
import * as queries from "../queries";
import {
  buildSearchQuery,
  endDateExclusive,
  paginatedResult,
} from "../query-helpers";

export class DocumentRepository {
  constructor(private readonly db: Database) {}

  public fetchInterpellations(params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.interpellationsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.interpellationsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchInterpellationById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        question_text: string | null;
        question_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
      },
      { $id: number }
    >(queries.interpellationById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signersStmt = this.db.prepare<
      {
        interpellation_id: number;
        signer_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        is_first_signer: number;
      },
      { $interpellationId: number }
    >(queries.interpellationSigners);
    const signers = signersStmt.all({ $interpellationId: detail.id });
    signersStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        interpellation_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $interpellationId: number }
    >(queries.interpellationStages);
    const stages = stagesStmt.all({ $interpellationId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { interpellation_id: number; subject_text: string },
      { $interpellationId: number }
    >(queries.interpellationSubjects);
    const subjects = subjectsStmt.all({ $interpellationId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.interpellationSessions);
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, signers, stages, subjects, sessions };
  }

  public fetchInterpellationByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        question_text: string | null;
        question_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.interpellationByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { interpellation_id: number; subject_text: string },
      { $interpellationId: number }
    >(queries.interpellationSubjects);
    const subjects = subjectsStmt.all({ $interpellationId: detail.id });
    subjectsStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        interpellation_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $interpellationId: number }
    >(queries.interpellationStages);
    const stages = stagesStmt.all({ $interpellationId: detail.id });
    stagesStmt.finalize();

    return { ...detail, subjects, stages };
  }

  public fetchInterpellationYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.interpellationYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchInterpellationsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.interpellationsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchGovernmentProposals(params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.govProposalsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        author: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.govProposalsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchGovernmentProposalById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        author: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        appendix_text: string | null;
        appendix_rich_text: string | null;
        signature_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        law_decision_text: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.govProposalById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signatoriesStmt = this.db.prepare<
      {
        proposal_id: number;
        signatory_order: number;
        first_name: string;
        last_name: string;
        title_text: string | null;
      },
      { $proposalId: number }
    >(queries.govProposalSignatories);
    const signatories = signatoriesStmt.all({ $proposalId: detail.id });
    signatoriesStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        proposal_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $proposalId: number }
    >(queries.govProposalStages);
    const stages = stagesStmt.all({ $proposalId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { proposal_id: number; subject_text: string; yso_uri: string | null },
      { $proposalId: number }
    >(queries.govProposalSubjects);
    const subjects = subjectsStmt.all({ $proposalId: detail.id });
    subjectsStmt.finalize();

    const lawsStmt = this.db.prepare<
      {
        proposal_id: number;
        law_order: number;
        law_type: string | null;
        law_name: string | null;
      },
      { $proposalId: number }
    >(queries.govProposalLaws);
    const laws = lawsStmt.all({ $proposalId: detail.id });
    lawsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.govProposalSessions);
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, signatories, stages, subjects, laws, sessions };
  }

  public fetchGovernmentProposalByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        author: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.govProposalByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { proposal_id: number; subject_text: string; yso_uri: string | null },
      { $proposalId: number }
    >(queries.govProposalSubjects);
    const subjects = subjectsStmt.all({ $proposalId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public fetchGovernmentProposalYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.govProposalYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchGovernmentProposalsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.govProposalsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchWrittenQuestions(params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.writtenQuestionsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        answer_minister_first_name: string | null;
        answer_minister_last_name: string | null;
        answer_minister_title: string | null;
        answer_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.writtenQuestionsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchWrittenQuestionById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        question_text: string | null;
        question_rich_text: string | null;
        answer_parliament_identifier: string | null;
        answer_minister_title: string | null;
        answer_minister_first_name: string | null;
        answer_minister_last_name: string | null;
        answer_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.writtenQuestionById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signersStmt = this.db.prepare<
      {
        question_id: number;
        signer_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        is_first_signer: number;
      },
      { $questionId: number }
    >(queries.writtenQuestionSigners);
    const signers = signersStmt.all({ $questionId: detail.id });
    signersStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        question_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $questionId: number }
    >(queries.writtenQuestionStages);
    const stages = stagesStmt.all({ $questionId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string },
      { $questionId: number }
    >(queries.writtenQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.writtenQuestionSessions);
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    let response_subjects: Array<{ subject_text: string }> = [];
    try {
      const responseSubjectsStmt = this.db.prepare<
        { subject_text: string },
        { $questionId: number }
      >(queries.writtenQuestionResponseSubjects);
      response_subjects = responseSubjectsStmt.all({ $questionId: detail.id });
      responseSubjectsStmt.finalize();
    } catch {
      // WrittenQuestionResponse table may not exist yet (DB not rebuilt after migration)
    }

    return {
      ...detail,
      signers,
      stages,
      subjects,
      sessions,
      response_subjects,
    };
  }

  public fetchWrittenQuestionByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        answer_minister_title: string | null;
        answer_minister_first_name: string | null;
        answer_minister_last_name: string | null;
        answer_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        question_text: string | null;
        question_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.writtenQuestionByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string },
      { $questionId: number }
    >(queries.writtenQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public fetchWrittenQuestionYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.writtenQuestionYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchWrittenQuestionsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.writtenQuestionsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchExpertStatements(params: {
    query?: string;
    year?: string;
    committee?: string;
    docType?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $committee = params.committee || null;
    const $docType = params.docType || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $committee: string | null;
        $docType: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.expertStatementsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $committee,
      $docType,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        document_type: string;
        edk_identifier: string;
        bill_identifier: string | null;
        committee_name: string | null;
        meeting_identifier: string | null;
        meeting_date: string | null;
        title: string | null;
        publicity: string | null;
        language: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $committee: string | null;
        $docType: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.expertStatementsList);
    const rows = stmt.all({
      $query,
      $year,
      $committee,
      $docType,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchExpertStatementYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.expertStatementYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchExpertStatementCommittees() {
    const stmt = this.db.prepare<{ committee_name: string; count: number }, []>(
      queries.expertStatementCommittees,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchWrittenQuestionResponses(params: {
    query?: string;
    year?: string;
    minister?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $minister = params.minister || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $minister: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.writtenQuestionResponsesCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $minister,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number | null;
        parliamentary_year: string;
        title: string | null;
        answer_date: string | null;
        minister_title: string | null;
        minister_first_name: string | null;
        minister_last_name: string | null;
        question_id: number;
        question_identifier: string;
        question_title: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $minister: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.writtenQuestionResponsesList);
    const rows = stmt.all({
      $query,
      $year,
      $minister,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchWrittenQuestionResponseYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.writtenQuestionResponsesYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchOralQuestions(params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.oralQuestionsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        question_text: string | null;
        asker_text: string | null;
        submission_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.oralQuestionsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchOralQuestionById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        question_text: string | null;
        asker_text: string | null;
        submission_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.oralQuestionById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const stagesStmt = this.db.prepare<
      {
        question_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $questionId: number }
    >(queries.oralQuestionStages);
    const stages = stagesStmt.all({ $questionId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string; yso_uri: string | null },
      { $questionId: number }
    >(queries.oralQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.oralQuestionSessions);
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, stages, subjects, sessions };
  }

  public fetchOralQuestionByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        question_text: string | null;
        asker_text: string | null;
        submission_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $identifier: string }
    >(queries.oralQuestionByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string; yso_uri: string | null },
      { $questionId: number }
    >(queries.oralQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public fetchOralQuestionYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.oralQuestionYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchOralQuestionsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.oralQuestionsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchCommitteeReports(params: {
    query?: string;
    year?: string;
    sourceCommittee?: string;
    recipientCommittee?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $sourceCommittee = params.sourceCommittee?.trim() || null;
    const $recipientCommittee = params.recipientCommittee?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $sourceCommittee: string | null;
        $recipientCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.committeeReportsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $sourceCommittee,
      $recipientCommittee,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        report_type_code: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        committee_name: string | null;
        recipient_committee: string | null;
        source_reference: string | null;
        draft_date: string | null;
        signature_date: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $sourceCommittee: string | null;
        $recipientCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.committeeReportsList);
    const rows = stmt.all({
      $query,
      $year,
      $sourceCommittee,
      $recipientCommittee,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchCommitteeReportById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        report_type_code: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        committee_name: string | null;
        recipient_committee: string | null;
        source_reference: string | null;
        draft_date: string | null;
        signature_date: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        general_reasoning_text: string | null;
        general_reasoning_rich_text: string | null;
        detailed_reasoning_text: string | null;
        detailed_reasoning_rich_text: string | null;
        decision_text: string | null;
        decision_rich_text: string | null;
        legislation_amendment_text: string | null;
        legislation_amendment_rich_text: string | null;
        minority_opinion_text: string | null;
        minority_opinion_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
      },
      { $id: number }
    >(queries.committeeReportById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const membersStmt = this.db.prepare<
      {
        report_id: number;
        member_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        role: string | null;
      },
      { $reportId: number }
    >(queries.committeeReportMembers);
    const members = membersStmt.all({ $reportId: detail.id });
    membersStmt.finalize();

    const expertsStmt = this.db.prepare<
      {
        report_id: number;
        expert_order: number;
        person_id: number | null;
        first_name: string | null;
        last_name: string | null;
        title: string | null;
        organization: string | null;
      },
      { $reportId: number }
    >(queries.committeeReportExperts);
    const experts = expertsStmt.all({ $reportId: detail.id });
    expertsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.committeeReportSessions);
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, members, experts, sessions };
  }

  public fetchCommitteeReportByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        report_type_code: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        committee_name: string | null;
        recipient_committee: string | null;
        source_reference: string | null;
        draft_date: string | null;
        signature_date: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        decision_text: string | null;
        decision_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
        legislation_amendment_text: string | null;
        legislation_amendment_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.committeeReportByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    return detail;
  }

  public fetchCommitteeReportYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.committeeReportYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchCommitteeReportSourceCommittees(params?: {
    query?: string;
    year?: string;
    recipientCommittee?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const $query = params?.query?.trim() || null;
    const $year = params?.year?.trim() || null;
    const $recipientCommittee = params?.recipientCommittee?.trim() || null;
    const stmt = this.db.prepare<
      { committee_name: string; count: number },
      {
        $query: string | null;
        $year: string | null;
        $recipientCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.committeeReportSourceCommittees);
    const data = stmt.all({
      $query,
      $year,
      $recipientCommittee,
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchCommitteeReportRecipientCommittees(params?: {
    query?: string;
    year?: string;
    sourceCommittee?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const $query = params?.query?.trim() || null;
    const $year = params?.year?.trim() || null;
    const $sourceCommittee = params?.sourceCommittee?.trim() || null;
    const stmt = this.db.prepare<
      { committee_name: string; count: number },
      {
        $query: string | null;
        $year: string | null;
        $sourceCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.committeeReportRecipientCommittees);
    const data = stmt.all({
      $query,
      $year,
      $sourceCommittee,
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchLegislativeInitiatives(params: {
    query?: string;
    year?: string;
    subject?: string;
    initiativeTypeCode?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;
    const $typeCode = params.initiativeTypeCode?.trim().toUpperCase() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $typeCode: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.legislativeInitiativesCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $typeCode,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        initiative_type_code: string;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $typeCode: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.legislativeInitiativesList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $typeCode,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchLegislativeInitiativeById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        initiative_type_code: string;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        law_text: string | null;
        law_rich_text: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.legislativeInitiativeById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signersStmt = this.db.prepare<
      {
        initiative_id: number;
        signer_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        is_first_signer: number;
      },
      { $initiativeId: number }
    >(queries.legislativeInitiativeSigners);
    const signers = signersStmt.all({ $initiativeId: detail.id });
    signersStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        initiative_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $initiativeId: number }
    >(queries.legislativeInitiativeStages);
    const stages = stagesStmt.all({ $initiativeId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { initiative_id: number; subject_text: string; yso_uri: string | null },
      { $initiativeId: number }
    >(queries.legislativeInitiativeSubjects);
    const subjects = subjectsStmt.all({ $initiativeId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.legislativeInitiativeSessions);
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, signers, stages, subjects, sessions };
  }

  public fetchLegislativeInitiativeByIdentifier(params: {
    identifier: string;
  }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        initiative_type_code: string;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        law_text: string | null;
        law_rich_text: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
      },
      { $identifier: string }
    >(queries.legislativeInitiativeByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { initiative_id: number; subject_text: string; yso_uri: string | null },
      { $initiativeId: number }
    >(queries.legislativeInitiativeSubjects);
    const subjects = subjectsStmt.all({ $initiativeId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public fetchLegislativeInitiativeYears(params?: {
    initiativeTypeCode?: string;
  }) {
    const $typeCode = params?.initiativeTypeCode?.trim().toUpperCase() || null;
    const stmt = this.db.prepare<
      { year: string },
      { $typeCode: string | null }
    >(queries.legislativeInitiativeYears);
    const data = stmt.all({ $typeCode });
    stmt.finalize();
    return data;
  }

  public fetchLegislativeInitiativesSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.legislativeInitiativesSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public federatedSearch(params: { q: string; limit?: number }) {
    const searchQuery = buildSearchQuery(params.q);
    if (!searchQuery) return [];
    const stmt = this.db.prepare<
      {
        type: string;
        id: string;
        title: string;
        subtitle: string | null;
        date: string | null;
      },
      { $q: string; $limit: number }
    >(queries.federatedSearch);
    const data = stmt.all({
      $q: searchQuery,
      $limit: params.limit ?? 30,
    });
    stmt.finalize();
    return data;
  }
}
