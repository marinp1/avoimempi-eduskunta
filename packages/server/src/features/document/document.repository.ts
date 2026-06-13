import type { Database } from "bun:sqlite";
import committeeReportById from "./sql/COMMITTEE_REPORT_BY_ID.sql";
import committeeReportExperts from "./sql/COMMITTEE_REPORT_EXPERTS.sql";
import committeeReportMembers from "./sql/COMMITTEE_REPORT_MEMBERS.sql";
import committeeReportSessions from "./sql/COMMITTEE_REPORT_SESSIONS.sql";
import committeeReportsCount from "./sql/COMMITTEE_REPORTS_COUNT.sql";
import committeeReportsList from "./sql/COMMITTEE_REPORTS_LIST.sql";
import expertStatementById from "./sql/EXPERT_STATEMENT_BY_ID.sql";
import expertStatementsCount from "./sql/EXPERT_STATEMENTS_COUNT.sql";
import expertStatementsList from "./sql/EXPERT_STATEMENTS_LIST.sql";
import govProposalById from "./sql/GOV_PROPOSAL_BY_ID.sql";
import govProposalLaws from "./sql/GOV_PROPOSAL_LAWS.sql";
import govProposalSessions from "./sql/GOV_PROPOSAL_SESSIONS.sql";
import govProposalSignatories from "./sql/GOV_PROPOSAL_SIGNATORIES.sql";
import govProposalStages from "./sql/GOV_PROPOSAL_STAGES.sql";
import govProposalSubjects from "./sql/GOV_PROPOSAL_SUBJECTS.sql";
import govProposalsCount from "./sql/GOV_PROPOSALS_COUNT.sql";
import govProposalsList from "./sql/GOV_PROPOSALS_LIST.sql";
import interpellationById from "./sql/INTERPELLATION_BY_ID.sql";
import interpellationSessions from "./sql/INTERPELLATION_SESSIONS.sql";
import interpellationSigners from "./sql/INTERPELLATION_SIGNERS.sql";
import interpellationStages from "./sql/INTERPELLATION_STAGES.sql";
import interpellationSubjects from "./sql/INTERPELLATION_SUBJECTS.sql";
import interpellationsCount from "./sql/INTERPELLATIONS_COUNT.sql";
import interpellationsList from "./sql/INTERPELLATIONS_LIST.sql";
import legislativeInitiativeById from "./sql/LEGISLATIVE_INITIATIVE_BY_ID.sql";
import legislativeInitiativeSessions from "./sql/LEGISLATIVE_INITIATIVE_SESSIONS.sql";
import legislativeInitiativeSigners from "./sql/LEGISLATIVE_INITIATIVE_SIGNERS.sql";
import legislativeInitiativeStages from "./sql/LEGISLATIVE_INITIATIVE_STAGES.sql";
import legislativeInitiativeSubjects from "./sql/LEGISLATIVE_INITIATIVE_SUBJECTS.sql";
import legislativeInitiativesCount from "./sql/LEGISLATIVE_INITIATIVES_COUNT.sql";
import legislativeInitiativesList from "./sql/LEGISLATIVE_INITIATIVES_LIST.sql";
import oralQuestionById from "./sql/ORAL_QUESTION_BY_ID.sql";
import oralQuestionSessions from "./sql/ORAL_QUESTION_SESSIONS.sql";
import oralQuestionStages from "./sql/ORAL_QUESTION_STAGES.sql";
import oralQuestionSubjects from "./sql/ORAL_QUESTION_SUBJECTS.sql";
import oralQuestionsCount from "./sql/ORAL_QUESTIONS_COUNT.sql";
import oralQuestionsList from "./sql/ORAL_QUESTIONS_LIST.sql";
import parliamentAnswerById from "./sql/PARLIAMENT_ANSWER_BY_ID.sql";
import parliamentAnswerSubjects from "./sql/PARLIAMENT_ANSWER_SUBJECTS.sql";
import parliamentAnswersCount from "./sql/PARLIAMENT_ANSWERS_COUNT.sql";
import parliamentAnswersList from "./sql/PARLIAMENT_ANSWERS_LIST.sql";
import writtenQuestionById from "./sql/WRITTEN_QUESTION_BY_ID.sql";
import writtenQuestionByIdentifier from "./sql/WRITTEN_QUESTION_BY_IDENTIFIER.sql";
import writtenQuestionResponseSubjects from "./sql/WRITTEN_QUESTION_RESPONSE_SUBJECTS.sql";
import writtenQuestionResponsesCount from "./sql/WRITTEN_QUESTION_RESPONSES_COUNT.sql";
import writtenQuestionResponsesList from "./sql/WRITTEN_QUESTION_RESPONSES_LIST.sql";
import writtenQuestionSessions from "./sql/WRITTEN_QUESTION_SESSIONS.sql";
import writtenQuestionSigners from "./sql/WRITTEN_QUESTION_SIGNERS.sql";
import writtenQuestionStages from "./sql/WRITTEN_QUESTION_STAGES.sql";
import writtenQuestionSubjects from "./sql/WRITTEN_QUESTION_SUBJECTS.sql";
import writtenQuestionsCount from "./sql/WRITTEN_QUESTIONS_COUNT.sql";
import writtenQuestionsList from "./sql/WRITTEN_QUESTIONS_LIST.sql";
import {
  buildFtsSearchQuery,
  endDateExclusive,
  paginatedResult,
} from "../../database/query-helpers";

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
    const $query = buildFtsSearchQuery(params.query);
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $subject: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(interpellationsCount)
      .get({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
      >(interpellationsList)
      .all({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchInterpellationById(params: { id: string }) {
    const detail = this.db
      .query<
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
      >(interpellationById)
      .get({ $id: +params.id });
    if (!detail) return null;

    const signers = this.db
      .query<
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
      >(interpellationSigners)
      .all({ $interpellationId: detail.id });

    const stages = this.db
      .query<
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
      >(interpellationStages)
      .all({ $interpellationId: detail.id });

    const subjects = this.db
      .query<
        { interpellation_id: number; subject_text: string },
        { $interpellationId: number }
      >(interpellationSubjects)
      .all({ $interpellationId: detail.id });

    const sessions = this.db
      .query<
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
      >(interpellationSessions)
      .all({
        $identifier: detail.parliament_identifier,
      });

    return { ...detail, signers, stages, subjects, sessions };
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
    const $query = buildFtsSearchQuery(params.query);
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $subject: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(govProposalsCount)
      .get({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
      >(govProposalsList)
      .all({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchGovernmentProposalById(params: { id: string }) {
    const detail = this.db
      .query<
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
      >(govProposalById)
      .get({ $id: +params.id });
    if (!detail) return null;

    const signatories = this.db
      .query<
        {
          proposal_id: number;
          signatory_order: number;
          first_name: string;
          last_name: string;
          title_text: string | null;
        },
        { $proposalId: number }
      >(govProposalSignatories)
      .all({ $proposalId: detail.id });

    const stages = this.db
      .query<
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
      >(govProposalStages)
      .all({ $proposalId: detail.id });

    const subjects = this.db
      .query<
        { proposal_id: number; subject_text: string; yso_uri: string | null },
        { $proposalId: number }
      >(govProposalSubjects)
      .all({ $proposalId: detail.id });

    const laws = this.db
      .query<
        {
          proposal_id: number;
          law_order: number;
          law_type: string | null;
          law_name: string | null;
        },
        { $proposalId: number }
      >(govProposalLaws)
      .all({ $proposalId: detail.id });

    const sessions = this.db
      .query<
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
      >(govProposalSessions)
      .all({
        $identifier: detail.parliament_identifier,
      });

    return { ...detail, signatories, stages, subjects, laws, sessions };
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
    const $query = buildFtsSearchQuery(params.query);
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $subject: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(writtenQuestionsCount)
      .get({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
      >(writtenQuestionsList)
      .all({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchWrittenQuestionById(params: { id: string }) {
    const detail = this.db
      .query<
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
          response_body_text: string | null;
        },
        { $id: number }
      >(writtenQuestionById)
      .get({ $id: +params.id });
    if (!detail) return null;

    const signers = this.db
      .query<
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
      >(writtenQuestionSigners)
      .all({ $questionId: detail.id });

    const stages = this.db
      .query<
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
      >(writtenQuestionStages)
      .all({ $questionId: detail.id });

    const subjects = this.db
      .query<
        { question_id: number; subject_text: string },
        { $questionId: number }
      >(writtenQuestionSubjects)
      .all({ $questionId: detail.id });

    const sessions = this.db
      .query<
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
      >(writtenQuestionSessions)
      .all({
        $identifier: detail.parliament_identifier,
      });

    let response_subjects: Array<{ subject_text: string }> = [];
    try {
      response_subjects = this.db
        .query<{ subject_text: string }, { $questionId: number }>(
          writtenQuestionResponseSubjects,
        )
        .all({ $questionId: detail.id });
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
    const detail = this.db
      .query<
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
      >(writtenQuestionByIdentifier)
      .get({ $identifier: params.identifier });
    if (!detail) return null;

    const subjects = this.db
      .query<
        { question_id: number; subject_text: string },
        { $questionId: number }
      >(writtenQuestionSubjects)
      .all({ $questionId: detail.id });

    return { ...detail, subjects };
  }

  public fetchExpertStatements(params: {
    query?: string;
    year?: string;
    committee?: string;
    docType?: string;
    organization?: string;
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
    const $organization = params.organization?.trim() || null;

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $committee: string | null;
          $docType: string | null;
          $organization: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(expertStatementsCount)
      .get({
        $query,
        $year,
        $committee,
        $docType,
        $organization,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
          $organization: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
          $limit: number;
          $offset: number;
        }
      >(expertStatementsList)
      .all({
        $query,
        $year,
        $committee,
        $docType,
        $organization,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchExpertStatementById(params: { id: string }) {
    const detail = this.db
      .query<
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
          body_text: string | null;
          author_text: string | null;
          author_organization: string | null;
        },
        { $id: number }
      >(expertStatementById)
      .get({ $id: +params.id });
    return detail ?? null;
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

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $minister: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(writtenQuestionResponsesCount)
      .get({
        $query,
        $year,
        $minister,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
      >(writtenQuestionResponsesList)
      .all({
        $query,
        $year,
        $minister,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
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
    const $query = buildFtsSearchQuery(params.query);
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $subject: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(oralQuestionsCount)
      .get({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
      >(oralQuestionsList)
      .all({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchOralQuestionById(params: { id: string }) {
    const detail = this.db
      .query<
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
          body_text: string | null;
        },
        { $id: number }
      >(oralQuestionById)
      .get({ $id: +params.id });
    if (!detail) return null;

    const stages = this.db
      .query<
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
      >(oralQuestionStages)
      .all({ $questionId: detail.id });

    const subjects = this.db
      .query<
        { question_id: number; subject_text: string; yso_uri: string | null },
        { $questionId: number }
      >(oralQuestionSubjects)
      .all({ $questionId: detail.id });

    const sessions = this.db
      .query<
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
      >(oralQuestionSessions)
      .all({
        $identifier: detail.parliament_identifier,
      });

    return { ...detail, stages, subjects, sessions };
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

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $sourceCommittee: string | null;
          $recipientCommittee: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(committeeReportsCount)
      .get({
        $query,
        $year,
        $sourceCommittee,
        $recipientCommittee,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
      >(committeeReportsList)
      .all({
        $query,
        $year,
        $sourceCommittee,
        $recipientCommittee,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchCommitteeReportById(params: { id: string }) {
    const detail = this.db
      .query<
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
      >(committeeReportById)
      .get({ $id: +params.id });
    if (!detail) return null;

    const members = this.db
      .query<
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
      >(committeeReportMembers)
      .all({ $reportId: detail.id });

    const experts = this.db
      .query<
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
      >(committeeReportExperts)
      .all({ $reportId: detail.id });

    const sessions = this.db
      .query<
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
      >(committeeReportSessions)
      .all({
        $identifier: detail.parliament_identifier,
      });

    return { ...detail, members, experts, sessions };
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
    const $query = buildFtsSearchQuery(params.query);
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;
    const $typeCode = params.initiativeTypeCode?.trim().toUpperCase() || null;

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $subject: string | null;
          $typeCode: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(legislativeInitiativesCount)
      .get({
        $query,
        $year,
        $subject,
        $typeCode,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
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
      >(legislativeInitiativesList)
      .all({
        $query,
        $year,
        $subject,
        $typeCode,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchLegislativeInitiativeById(params: { id: string }) {
    const detail = this.db
      .query<
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
          body_text: string | null;
        },
        { $id: number }
      >(legislativeInitiativeById)
      .get({ $id: +params.id });
    if (!detail) return null;

    const signers = this.db
      .query<
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
      >(legislativeInitiativeSigners)
      .all({ $initiativeId: detail.id });

    const stages = this.db
      .query<
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
      >(legislativeInitiativeStages)
      .all({ $initiativeId: detail.id });

    const subjects = this.db
      .query<
        { initiative_id: number; subject_text: string; yso_uri: string | null },
        { $initiativeId: number }
      >(legislativeInitiativeSubjects)
      .all({ $initiativeId: detail.id });

    const sessions = this.db
      .query<
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
      >(legislativeInitiativeSessions)
      .all({
        $identifier: detail.parliament_identifier,
      });

    return { ...detail, signers, stages, subjects, sessions };
  }

  public fetchParliamentAnswers(params: {
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

    const countResult = this.db
      .query<
        { count: number },
        {
          $query: string | null;
          $year: string | null;
          $subject: string | null;
          $startDate: string | null;
          $endDateExclusive: string | null;
        }
      >(parliamentAnswersCount)
      .get({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
      });
    const totalCount = countResult?.count || 0;

    const rows = this.db
      .query<
        {
          id: number;
          parliament_identifier: string;
          document_number: number;
          parliamentary_year: string;
          title: string | null;
          source_reference: string | null;
          committee_report_reference: string | null;
          submission_date: string | null;
          signature_date: string | null;
          signatory_count: number;
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
      >(parliamentAnswersList)
      .all({
        $query,
        $year,
        $subject,
        $startDate: params.startDate || null,
        $endDateExclusive: endDateExclusiveValue,
        $limit: params.limit,
        $offset: offset,
      });

    return paginatedResult(rows, totalCount, params.page, params.limit);
  }

  public fetchParliamentAnswerById(params: { id: string }) {
    const detail = this.db
      .query<
        {
          id: number;
          parliament_identifier: string;
          document_number: number;
          parliamentary_year: string;
          title: string | null;
          source_reference: string | null;
          committee_report_reference: string | null;
          submission_date: string | null;
          signature_date: string | null;
          language: string;
          edk_identifier: string | null;
          decision_text: string | null;
          decision_rich_text: string | null;
          legislation_text: string | null;
          legislation_rich_text: string | null;
          signatory_count: number;
        },
        { $id: number }
      >(parliamentAnswerById)
      .get({ $id: +params.id });
    if (!detail) return null;

    const subjects = this.db
      .query<
        { answer_id: number; subject_order: number; subject_text: string },
        { $answerId: number }
      >(parliamentAnswerSubjects)
      .all({ $answerId: detail.id });

    return { ...detail, subjects };
  }
}
