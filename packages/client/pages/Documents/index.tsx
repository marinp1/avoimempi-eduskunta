import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
	Box,
	TextField,
	Select,
	MenuItem,
	FormControl,
	InputLabel,
	Typography,
	Chip,
	Button,
	CircularProgress,
	Collapse,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Stack,
	InputAdornment,
	Alert,
} from "@mui/material";
import {
	Search as SearchIcon,
	ExpandMore as ExpandMoreIcon,
	Person as PersonIcon,
	Timeline as TimelineIcon,
	Article as ArticleIcon,
	Gavel as GavelIcon,
	Event as EventIcon,
	Balance as BalanceIcon,
	Groups as GroupsIcon,
	School as SchoolIcon,
} from "@mui/icons-material";
import { RelatedVotings } from "#client/components/DocumentCards";
import { DocumentLifecycle } from "#client/components/DocumentLifecycle";
import { RichTextRenderer } from "#client/components/RichTextRenderer";
import { DataCard, PageHeader } from "#client/theme/components";
import { colors } from "#client/theme/index";

type DocumentType =
	| "interpellations"
	| "government-proposals"
	| "written-questions"
	| "oral-questions"
	| "committee-reports"
	| "legislative-initiatives-law"
	| "legislative-initiatives-budget"
	| "legislative-initiatives-supplementary-budget"
	| "legislative-initiatives-action"
	| "legislative-initiatives-discussion"
	| "legislative-initiatives-citizens";

const LEGISLATIVE_INITIATIVE_TYPE_BY_DOCUMENT_TYPE: Partial<
	Record<DocumentType, string>
> = {
	"legislative-initiatives-law": "LA",
	"legislative-initiatives-budget": "TAA",
	"legislative-initiatives-supplementary-budget": "LTA",
	"legislative-initiatives-action": "TPA",
	"legislative-initiatives-discussion": "KA",
	"legislative-initiatives-citizens": "KAA",
};

const getDocumentApiConfig = (
	documentType: DocumentType,
): { apiBase: string; initiativeTypeCode: string | null } => {
	if (documentType === "interpellations") {
		return { apiBase: "/api/interpellations", initiativeTypeCode: null };
	}
	if (documentType === "government-proposals") {
		return { apiBase: "/api/government-proposals", initiativeTypeCode: null };
	}
	if (documentType === "oral-questions") {
		return { apiBase: "/api/oral-questions", initiativeTypeCode: null };
	}
	if (documentType === "committee-reports") {
		return { apiBase: "/api/committee-reports", initiativeTypeCode: null };
	}
	if (documentType === "written-questions") {
		return { apiBase: "/api/written-questions", initiativeTypeCode: null };
	}
	return {
		apiBase: "/api/legislative-initiatives",
		initiativeTypeCode:
			LEGISLATIVE_INITIATIVE_TYPE_BY_DOCUMENT_TYPE[documentType] || null,
	};
};

const formatDate = (dateStr: string | null) => {
	if (!dateStr) return "—";
	const date = new Date(dateStr);
	return date.toLocaleDateString("fi-FI");
};

const getOutcomeColor = (code: string | null): string => {
	if (!code) return colors.dataBorder;
	const normalized = code.toLowerCase();
	if (
		normalized.includes("hyväk") ||
		normalized.includes("myön") ||
		normalized.includes("accept") ||
		normalized.includes("passed")
	) {
		return colors.success;
	}
	if (
		normalized.includes("hylä") ||
		normalized.includes("reject") ||
		normalized.includes("kiel")
	) {
		return colors.error;
	}
	return colors.dataBorder;
};

const getCommitteeReportKind = (
	reportTypeCode: string | null | undefined,
): "report" | "statement" | null => {
	if (!reportTypeCode) return null;
	const normalized = reportTypeCode.trim().toUpperCase();
	if (normalized.endsWith("VM")) return "report";
	if (normalized.endsWith("VL")) return "statement";
	return null;
};

type RelatedSessionItem = {
	session_key: string;
	session_date: string;
	session_type: string;
	session_number: number;
	session_year: string;
	section_title: string | null;
	section_key: string;
};

function InlineRelatedSessions({ sessions }: { sessions: RelatedSessionItem[] }) {
	const { t } = useTranslation();
	const [expandedSectionKey, setExpandedSectionKey] = useState<string | null>(null);
	const [loadingBySection, setLoadingBySection] = useState<Record<string, boolean>>({});
	const [detailsBySection, setDetailsBySection] = useState<
		Record<string, {
			votings: Array<{
				id: number;
				number: number;
				start_time: string | null;
				title: string | null;
				section_title: string | null;
				n_yes: number;
				n_no: number;
				n_total: number;
			}>;
			links: Array<{
				id: number;
				label: string | null;
				url: string | null;
				document_tunnus: string | null;
			}>;
			subsections: Array<{
				id: number;
				item_title: string | null;
				content_text: string | null;
				related_document_identifier: string | null;
			}>;
		}>
	>({});

	const fetchSessionSectionDetails = (sectionKey: string) => {
		if (loadingBySection[sectionKey] || detailsBySection[sectionKey]) return;
		setLoadingBySection((prev) => ({ ...prev, [sectionKey]: true }));
		Promise.all([
			fetch(`/api/sections/${encodeURIComponent(sectionKey)}/votings`)
				.then((res) => (res.ok ? res.json() : []))
				.catch(() => []),
			fetch(`/api/sections/${encodeURIComponent(sectionKey)}/links`)
				.then((res) => (res.ok ? res.json() : []))
				.catch(() => []),
			fetch(`/api/sections/${encodeURIComponent(sectionKey)}/subsections`)
				.then((res) => (res.ok ? res.json() : []))
				.catch(() => []),
		])
			.then(([votings, links, subsections]) => {
				setDetailsBySection((prev) => ({
					...prev,
					[sectionKey]: { votings, links, subsections },
				}));
			})
			.finally(() => {
				setLoadingBySection((prev) => ({ ...prev, [sectionKey]: false }));
			});
	};

	if (sessions.length === 0) return null;

	return (
		<Box>
			<Stack
				direction="row"
				spacing={1}
				alignItems="center"
				sx={{ mb: 1.5 }}
			>
				<EventIcon sx={{ color: colors.primary }} />
				<Typography
					variant="subtitle1"
					sx={{ fontWeight: 600, color: colors.textPrimary }}
				>
					{t("documents.relatedSessions", "Liittyvät istunnot")}
				</Typography>
			</Stack>
			<Stack spacing={1}>
				{sessions.map((session) => {
					const isExpanded = expandedSectionKey === session.section_key;
					const details = detailsBySection[session.section_key];
					const loading = !!loadingBySection[session.section_key];
					return (
						<Box
							key={session.section_key}
							sx={{
								p: 1,
								borderLeft: `3px solid ${colors.primary}`,
								borderRadius: 1,
								backgroundColor: colors.backgroundSubtle,
							}}
						>
							<Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
								<Typography
									variant="body2"
									sx={{ fontWeight: 500, color: colors.primary, flex: 1, minWidth: 140 }}
								>
									{session.session_type} {session.session_number}/{session.session_year} — {formatDate(session.session_date)}
								</Typography>
								<Button
									size="small"
									sx={{ textTransform: "none" }}
									endIcon={
										<ExpandMoreIcon
											sx={{
												fontSize: 14,
												transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
												transition: "transform 0.2s",
											}}
										/>
									}
									onClick={() => {
										const next = isExpanded ? null : session.section_key;
										setExpandedSectionKey(next);
										if (next) fetchSessionSectionDetails(next);
									}}
								>
									{isExpanded ? "Piilota tiedot" : "Näytä tiedot"}
								</Button>
								<Button
									size="small"
									sx={{ textTransform: "none" }}
									endIcon={<EventIcon sx={{ fontSize: 14 }} />}
									onClick={() => {
										window.history.pushState({}, "", `/istunnot?date=${session.session_date}`);
										window.dispatchEvent(new PopStateEvent("popstate"));
									}}
								>
									Avaa istunto
								</Button>
							</Box>
							{session.section_title && (
								<Typography variant="caption" sx={{ color: colors.textSecondary }}>
									{session.section_title}
								</Typography>
							)}
							<Collapse in={isExpanded} timeout="auto" unmountOnExit>
								<Box sx={{ mt: 1, p: 1, border: `1px solid ${colors.dataBorder}`, borderRadius: 1 }}>
									{loading && (
										<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
											<CircularProgress size={14} />
											<Typography variant="caption" sx={{ color: colors.textSecondary }}>
												Ladataan istunnon tietoja...
											</Typography>
										</Box>
									)}
									{!loading && details && (
										<Stack spacing={1}>
											<Typography variant="caption" sx={{ color: colors.textSecondary }}>
												Äänestyksiä: {details.votings.length} · Asiakirjalinkkejä: {details.links.length} · Alakohtia: {details.subsections.length}
											</Typography>
											{details.votings.length > 0 && (
												<Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
													{details.votings.slice(0, 6).map((voting) => (
														<Chip
															key={voting.id}
															size="small"
															variant="outlined"
															label={`${voting.id}: ${voting.n_yes}-${voting.n_no}`}
															sx={{ height: 20, fontSize: "0.65rem" }}
														/>
													))}
													{details.votings.length > 6 && (
														<Typography variant="caption" sx={{ color: colors.textSecondary }}>
															+{details.votings.length - 6} äänestystä
														</Typography>
													)}
												</Box>
											)}
											{details.subsections.length > 0 && (
												<Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
													{details.subsections.slice(0, 2).map((subsection) => (
														<Typography
															key={subsection.id}
															variant="caption"
															sx={{ color: colors.textSecondary }}
														>
															{subsection.item_title || subsection.related_document_identifier || subsection.content_text || "Alakohta"}
														</Typography>
													))}
												</Box>
											)}
											{details.links.length > 0 && (
												<Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
													{details.links.slice(0, 4).map((link) => (
														<Chip
															key={link.id}
															size="small"
															component="a"
															clickable
															href={link.url || undefined}
															target="_blank"
															rel="noopener noreferrer"
															label={link.document_tunnus || link.label || "Asiakirjalinkki"}
															sx={{ height: 20, fontSize: "0.65rem" }}
														/>
													))}
													{details.links.length > 4 && (
														<Typography variant="caption" sx={{ color: colors.textSecondary }}>
															+{details.links.length - 4} linkkiä
														</Typography>
													)}
												</Box>
											)}
										</Stack>
									)}
								</Box>
							</Collapse>
						</Box>
					);
				})}
			</Stack>
		</Box>
	);
}

// ─── Interpellation types and card ───

interface InterpellationListItem {
	id: number;
	parliament_identifier: string;
	document_number: string;
	parliamentary_year: number;
	title: string | null;
	submission_date: string | null;
	first_signer_first_name: string | null;
	first_signer_last_name: string | null;
	first_signer_party: string | null;
	co_signer_count: number;
	decision_outcome: string | null;
	decision_outcome_code: string | null;
	subjects: string | null;
}

interface InterpellationDetail {
	id: number;
	parliament_identifier: string;
	document_number: string;
	parliamentary_year: number;
	title: string | null;
	submission_date: string | null;
	question_text: string | null;
	question_rich_text: string | null;
	resolution_text: string | null;
	resolution_rich_text: string | null;
	decision_outcome: string | null;
	decision_outcome_code: string | null;
	signers: Array<{
		signer_order: number;
		is_first_signer: number;
		first_name: string | null;
		last_name: string | null;
		party: string | null;
	}>;
	stages: Array<{
		stage_title: string | null;
		stage_code: string | null;
		event_date: string | null;
		event_title: string | null;
		event_description: string | null;
	}>;
	subjects: Array<{ subject_text: string }>;
	sessions: Array<{
		session_key: string;
		session_date: string;
		session_type: string;
		session_number: number;
		session_year: string;
		section_title: string | null;
		section_key: string;
	}>;
}

function InterpellationCard({ item }: { item: InterpellationListItem }) {
	const { t } = useTranslation();

	const [expanded, setExpanded] = useState(false);
	const [detail, setDetail] = useState<InterpellationDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showJustification, setShowJustification] = useState(false);
	const [showClauses, setShowClauses] = useState(false);

	const subjects = item.subjects
		? item.subjects.split("||").filter(Boolean)
		: [];
	const displaySubjects = subjects.slice(0, 3);
	const remainingSubjects = subjects.length - 3;

	const handleExpand = async () => {
		if (!expanded && !detail) {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/interpellations/${item.id}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				setDetail(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load");
			} finally {
				setLoading(false);
			}
		}
		setExpanded(!expanded);
	};

	return (
		<DataCard>
			<Box
				sx={{
					cursor: "pointer",
					"&:hover": {
						backgroundColor: colors.backgroundSubtle,
					},
					transition: "background-color 0.2s",
					p: 2,
				}}
				onClick={handleExpand}
			>
				<Stack spacing={1.5}>
					{/* Title row */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="flex-start"
						flexWrap="wrap"
					>
						<Typography
							variant="h6"
							sx={{
								flex: 1,
								minWidth: "200px",
								color: colors.textPrimary,
								fontWeight: 500,
							}}
						>
							{item.title || t("documents.noTitle", "Ei otsikkoa")}
						</Typography>
						<Chip
							label={item.parliament_identifier}
							size="small"
							sx={{
								backgroundColor: colors.primaryLight,
								color: colors.primary,
								fontWeight: 500,
							}}
						/>
					</Stack>

					{/* Metadata row */}
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						flexWrap="wrap"
						alignItems={{ xs: "flex-start", sm: "center" }}
					>
						{item.submission_date && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.submissionDate", "Jättöpäivä")}:{" "}
								{formatDate(item.submission_date)}
							</Typography>
						)}

						{(item.first_signer_first_name || item.first_signer_last_name) && (
							<Stack direction="row" spacing={0.5} alignItems="center">
								<PersonIcon
									fontSize="small"
									sx={{ color: colors.textSecondary }}
								/>
								<Typography variant="body2" color={colors.textSecondary}>
									{[item.first_signer_first_name, item.first_signer_last_name]
										.filter(Boolean)
										.join(" ")}
									{item.first_signer_party && ` (${item.first_signer_party})`}
									{item.co_signer_count > 0 &&
										` +${item.co_signer_count}`}
								</Typography>
							</Stack>
						)}

						{item.decision_outcome && (
							<Chip
								label={item.decision_outcome}
								size="small"
								sx={{
									backgroundColor: getOutcomeColor(item.decision_outcome_code),
									color: "#fff",
									fontWeight: 500,
								}}
							/>
						)}
					</Stack>

					{/* Subjects */}
					{subjects.length > 0 && (
						<Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
							{displaySubjects.map((subject, idx) => (
								<Chip
									key={idx}
									label={subject}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							))}
							{remainingSubjects > 0 && (
								<Chip
									label={`+${remainingSubjects}`}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							)}
						</Stack>
					)}
				</Stack>

				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 1,
					}}
				>
					<ExpandMoreIcon
						sx={{
							transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
							transition: "transform 0.3s",
							color: colors.textSecondary,
						}}
					/>
				</Box>
			</Box>

			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<Box sx={{ p: 2, pt: 0, borderTop: `1px solid ${colors.dataBorder}` }}>
					{loading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
							<CircularProgress size={32} />
						</Box>
					)}

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					{detail && (
						<Stack spacing={3}>
							{detail.signers.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<PersonIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.signers", "Allekirjoittajat")}
										</Typography>
									</Stack>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>#</TableCell>
													<TableCell>{t("documents.author", "Tekijä")}</TableCell>
													<TableCell>{t("party", "Puolue")}</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{detail.signers.map((signer, idx) => (
													<TableRow key={idx}>
														<TableCell>
															<Stack
																direction="row"
																spacing={0.5}
																alignItems="center"
															>
																{idx + 1}
																{signer.is_first_signer === 1 && (
																	<Chip
																		label={t(
																			"documents.firstSigner",
																			"Ensimmäinen",
																		)}
																		size="small"
																		sx={{
																			height: 20,
																			fontSize: "0.7rem",
																			backgroundColor: colors.primaryLight,
																			color: colors.primary,
																		}}
																	/>
																)}
															</Stack>
														</TableCell>
														<TableCell>
															{[signer.first_name, signer.last_name]
																.filter(Boolean)
																.join(" ") || "—"}
														</TableCell>
														<TableCell>{signer.party || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{detail.stages.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<TimelineIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.stages", "Käsittelyvaiheet")}
										</Typography>
									</Stack>
									<Stack spacing={1.5}>
										{detail.stages.map((stage, idx) => (
											<Box
												key={idx}
												sx={{
													pl: 2,
													borderLeft: `3px solid ${colors.primary}`,
												}}
											>
												<Typography
													variant="body2"
													sx={{ fontWeight: 500, color: colors.textPrimary }}
												>
													{stage.stage_title || "—"}
												</Typography>
												{stage.event_date && (
													<Typography
														variant="caption"
														sx={{ color: colors.textSecondary }}
													>
														{formatDate(stage.event_date)}
													</Typography>
												)}
												{stage.event_title && stage.event_title !== stage.stage_title && (
													<Typography
														variant="body2"
														sx={{ mt: 0.25, color: colors.textPrimary, fontWeight: 400 }}
													>
														{stage.event_title}
													</Typography>
												)}
												{stage.event_description && (
													<Typography
														variant="body2"
														sx={{ mt: 0.5, color: colors.textSecondary }}
													>
														{stage.event_description}
													</Typography>
												)}
											</Box>
										))}
									</Stack>
								</Box>
							)}

								{(detail.question_text || detail.question_rich_text) && (
									<Box>
									<Button
										startIcon={<ArticleIcon />}
										onClick={() => setShowJustification(!showJustification)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showJustification
											? t("documents.hideJustification", "Piilota perustelut")
											: t("documents.showJustification", "Näytä perustelut")}
									</Button>
									<Collapse in={showJustification}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.question_rich_text}
													fallbackText={detail.question_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{(detail.resolution_text || detail.resolution_rich_text) && (
									<Box>
									<Button
										startIcon={<GavelIcon />}
										onClick={() => setShowClauses(!showClauses)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showClauses
											? t("documents.hideClauses", "Piilota ponnet")
											: t("documents.showClauses", "Näytä ponnet")}
									</Button>
									<Collapse in={showClauses}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${getOutcomeColor(
													detail.decision_outcome_code,
												)}`,
											}}
										>
												<RichTextRenderer
													document={detail.resolution_rich_text}
													fallbackText={detail.resolution_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

							<DocumentLifecycle
								currentIdentifier={item.parliament_identifier}
								directReferenceValues={[
									...detail.stages.map((stage) => stage.stage_title),
									...detail.stages.map((stage) => stage.event_title),
									...detail.stages.map((stage) => stage.event_description),
								]}
								richTextValues={[detail.question_rich_text, detail.resolution_rich_text]}
							/>

							<InlineRelatedSessions sessions={detail.sessions} />

							<RelatedVotings identifiers={[item.parliament_identifier]} />
						</Stack>
					)}
				</Box>
			</Collapse>
		</DataCard>
	);
}

// ─── Legislative initiative types and card ───

interface LegislativeInitiativeListItem {
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
}

interface LegislativeInitiativeDetail {
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
	signers: Array<{
		signer_order: number;
		person_id: number | null;
		first_name: string;
		last_name: string;
		party: string | null;
		is_first_signer: number;
	}>;
	stages: Array<{
		stage_order: number;
		stage_title: string | null;
		stage_code: string | null;
		event_date: string | null;
		event_title: string | null;
		event_description: string | null;
	}>;
	subjects: Array<{ subject_text: string; yso_uri: string | null }>;
	sessions: Array<{
		session_key: string;
		session_date: string;
		session_type: string;
		session_number: number;
		session_year: string;
		section_title: string | null;
		section_key: string;
	}>;
}

function LegislativeInitiativeCard({
	item,
}: {
	item: LegislativeInitiativeListItem;
}) {
	const { t } = useTranslation();
	const [expanded, setExpanded] = useState(false);
	const [detail, setDetail] = useState<LegislativeInitiativeDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showJustification, setShowJustification] = useState(false);
	const [showProposalText, setShowProposalText] = useState(false);
	const [showLawText, setShowLawText] = useState(false);

	const subjects = item.subjects
		? item.subjects.split("||").filter(Boolean)
		: [];
	const displaySubjects = subjects.slice(0, 3);
	const remainingSubjects = subjects.length - 3;

	const handleExpand = async () => {
		if (!expanded && !detail) {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/legislative-initiatives/${item.id}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				setDetail(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load");
			} finally {
				setLoading(false);
			}
		}
		setExpanded(!expanded);
	};

	const signer = [item.first_signer_first_name, item.first_signer_last_name]
		.filter(Boolean)
		.join(" ");
	const signerWithParty = item.first_signer_party
		? `${signer} (${item.first_signer_party})`
		: signer;

	return (
		<DataCard>
			<Box
				sx={{
					cursor: "pointer",
					"&:hover": {
						backgroundColor: colors.backgroundSubtle,
					},
					transition: "background-color 0.2s",
					p: 2,
				}}
				onClick={handleExpand}
			>
				<Stack spacing={1.5}>
					<Stack
						direction="row"
						spacing={1}
						alignItems="flex-start"
						flexWrap="wrap"
					>
						<Typography
							variant="h6"
							sx={{
								flex: 1,
								minWidth: "200px",
								color: colors.textPrimary,
								fontWeight: 500,
							}}
						>
							{item.title || t("documents.noTitle", "Ei otsikkoa")}
						</Typography>
						<Chip
							label={item.parliament_identifier}
							size="small"
							sx={{
								backgroundColor: colors.primaryLight,
								color: colors.primary,
								fontWeight: 500,
							}}
						/>
						<Chip
							label={item.initiative_type_code}
							size="small"
							variant="outlined"
						/>
					</Stack>

					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						flexWrap="wrap"
						alignItems={{ xs: "flex-start", sm: "center" }}
					>
						{item.submission_date && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.submissionDate", "Jättöpäivä")}:{" "}
								{formatDate(item.submission_date)}
							</Typography>
						)}

						{signerWithParty && (
							<Typography variant="body2" color={colors.textSecondary}>
								{signerWithParty}
							</Typography>
						)}

						{item.decision_outcome && (
							<Chip
								label={item.decision_outcome}
								size="small"
								sx={{
									backgroundColor: getOutcomeColor(item.decision_outcome_code),
									color: "#fff",
									fontWeight: 500,
								}}
							/>
						)}

						{item.latest_stage_code && !item.decision_outcome && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.latestStage", "Viimeisin vaihe")}: {item.latest_stage_code}
							</Typography>
						)}
					</Stack>

					{subjects.length > 0 && (
						<Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
							{displaySubjects.map((subject, idx) => (
								<Chip
									key={idx}
									label={subject}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							))}
							{remainingSubjects > 0 && (
								<Chip
									label={`+${remainingSubjects}`}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							)}
						</Stack>
					)}
				</Stack>

				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 1,
						transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
						transition: "transform 0.2s",
					}}
				>
					<ExpandMoreIcon sx={{ color: colors.textSecondary }} />
				</Box>
			</Box>

			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<Box sx={{ px: 2, pb: 2 }}>
					{loading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
							<CircularProgress size={24} />
						</Box>
					)}

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{t("documents.loadError", "Virhe ladattaessa tietoja")}: {error}
						</Alert>
					)}

					{detail && (
						<Stack spacing={2}>
								{(detail.justification_text || detail.justification_rich_text) && (
									<Box>
									<Button
										startIcon={<ArticleIcon />}
										onClick={() => setShowJustification(!showJustification)}
										sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
									>
										{showJustification
											? t("documents.hideJustification", "Piilota perustelut")
											: t("documents.showJustification", "Näytä perustelut")}
									</Button>
									<Collapse in={showJustification}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.info}`,
											}}
										>
												<RichTextRenderer
													document={detail.justification_rich_text}
													fallbackText={detail.justification_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{(detail.proposal_text || detail.proposal_rich_text) && (
									<Box>
									<Button
										startIcon={<GavelIcon />}
										onClick={() => setShowProposalText(!showProposalText)}
										sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
									>
										{showProposalText
											? t("documents.hideClauses", "Piilota ponnet")
											: t("documents.showClauses", "Näytä ponnet")}
									</Button>
									<Collapse in={showProposalText}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.proposal_rich_text}
													fallbackText={detail.proposal_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{(detail.law_text || detail.law_rich_text) && (
									<Box>
									<Button
										startIcon={<BalanceIcon />}
										onClick={() => setShowLawText(!showLawText)}
										sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
									>
										{showLawText
											? t("documents.hideLawText", "Piilota lakiteksti")
											: t("documents.showLawText", "Näytä lakiteksti")}
									</Button>
									<Collapse in={showLawText}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.success}`,
											}}
										>
												<RichTextRenderer
													document={detail.law_rich_text}
													fallbackText={detail.law_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

							<DocumentLifecycle
								currentIdentifier={item.parliament_identifier}
								directReferenceValues={[
									...detail.stages.map((stage) => stage.stage_title),
									...detail.stages.map((stage) => stage.event_title),
									...detail.stages.map((stage) => stage.event_description),
								]}
								richTextValues={[
									detail.justification_rich_text,
									detail.proposal_rich_text,
									detail.law_rich_text,
								]}
							/>

							<InlineRelatedSessions sessions={detail.sessions} />

							<RelatedVotings identifiers={[item.parliament_identifier]} />
						</Stack>
					)}
				</Box>
			</Collapse>
		</DataCard>
	);
}

// ─── Government proposal types and card ───

interface GovernmentProposalListItem {
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
}

interface GovernmentProposalDetail {
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
	signatories: Array<{
		signatory_order: number;
		first_name: string;
		last_name: string;
		title_text: string | null;
	}>;
	stages: Array<{
		stage_title: string | null;
		stage_code: string | null;
		event_date: string | null;
		event_title: string | null;
		event_description: string | null;
	}>;
	subjects: Array<{ subject_text: string; yso_uri: string | null }>;
	laws: Array<{
		law_order: number;
		law_type: string | null;
		law_name: string | null;
	}>;
	sessions: Array<{
		session_key: string;
		session_date: string;
		session_type: string;
		session_number: number;
		session_year: string;
		section_title: string | null;
		section_key: string;
	}>;
}

function GovernmentProposalCard({ item }: { item: GovernmentProposalListItem }) {
	const { t } = useTranslation();

	const [expanded, setExpanded] = useState(false);
	const [detail, setDetail] = useState<GovernmentProposalDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showSummary, setShowSummary] = useState(false);
	const [showProposalText, setShowProposalText] = useState(false);

	const subjects = item.subjects
		? item.subjects.split("||").filter(Boolean)
		: [];
	const displaySubjects = subjects.slice(0, 3);
	const remainingSubjects = subjects.length - 3;

	const handleExpand = async () => {
		if (!expanded && !detail) {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/government-proposals/${item.id}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				setDetail(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load");
			} finally {
				setLoading(false);
			}
		}
		setExpanded(!expanded);
	};

	return (
		<DataCard>
			<Box
				sx={{
					cursor: "pointer",
					"&:hover": {
						backgroundColor: colors.backgroundSubtle,
					},
					transition: "background-color 0.2s",
					p: 2,
				}}
				onClick={handleExpand}
			>
				<Stack spacing={1.5}>
					{/* Title row */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="flex-start"
						flexWrap="wrap"
					>
						<Typography
							variant="h6"
							sx={{
								flex: 1,
								minWidth: "200px",
								color: colors.textPrimary,
								fontWeight: 500,
							}}
						>
							{item.title || t("documents.noTitle", "Ei otsikkoa")}
						</Typography>
						<Chip
							label={item.parliament_identifier}
							size="small"
							sx={{
								backgroundColor: colors.primaryLight,
								color: colors.primary,
								fontWeight: 500,
							}}
						/>
					</Stack>

					{/* Metadata row */}
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						flexWrap="wrap"
						alignItems={{ xs: "flex-start", sm: "center" }}
					>
						{item.submission_date && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.submissionDate", "Jättöpäivä")}:{" "}
								{formatDate(item.submission_date)}
							</Typography>
						)}

						{item.author && (
							<Stack direction="row" spacing={0.5} alignItems="center">
								<PersonIcon
									fontSize="small"
									sx={{ color: colors.textSecondary }}
								/>
								<Typography variant="body2" color={colors.textSecondary}>
									{item.author}
								</Typography>
							</Stack>
						)}

						{item.decision_outcome && (
							<Chip
								label={item.decision_outcome}
								size="small"
								sx={{
									backgroundColor: getOutcomeColor(item.decision_outcome_code),
									color: "#fff",
									fontWeight: 500,
								}}
							/>
						)}

						{item.latest_stage_code && !item.decision_outcome && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.latestStage", "Viimeisin vaihe")}: {item.latest_stage_code}
							</Typography>
						)}
					</Stack>

					{/* Subjects */}
					{subjects.length > 0 && (
						<Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
							{displaySubjects.map((subject, idx) => (
								<Chip
									key={idx}
									label={subject}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							))}
							{remainingSubjects > 0 && (
								<Chip
									label={`+${remainingSubjects}`}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							)}
						</Stack>
					)}
				</Stack>

				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 1,
					}}
				>
					<ExpandMoreIcon
						sx={{
							transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
							transition: "transform 0.3s",
							color: colors.textSecondary,
						}}
					/>
				</Box>
			</Box>

			{/* Expanded content */}
			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<Box sx={{ p: 2, pt: 0, borderTop: `1px solid ${colors.dataBorder}` }}>
					{loading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
							<CircularProgress size={32} />
						</Box>
					)}

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					{detail && (
						<Stack spacing={3}>
							{/* Signatories */}
							{detail.signatories.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<PersonIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.proposalSignatories", "Allekirjoittajat")}
										</Typography>
									</Stack>
									{detail.signature_date && (
										<Typography
											variant="body2"
											sx={{ mb: 1, color: colors.textSecondary }}
										>
											{detail.signature_date}
										</Typography>
									)}
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>#</TableCell>
													<TableCell>{t("common.name", "Nimi")}</TableCell>
													<TableCell>{t("documents.signatoryTitle", "Asema")}</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{detail.signatories.map((sig, idx) => (
													<TableRow key={idx}>
														<TableCell>{idx + 1}</TableCell>
														<TableCell>
															{sig.first_name} {sig.last_name}
														</TableCell>
														<TableCell>{sig.title_text || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{/* Laws */}
							{detail.laws.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<BalanceIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.proposalLaws", "Lakiehdotukset")}
										</Typography>
									</Stack>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>#</TableCell>
													<TableCell>{t("documents.lawType", "Tyyppi")}</TableCell>
													<TableCell>{t("documents.lawName", "Nimi")}</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{detail.laws.map((law, idx) => (
													<TableRow key={idx}>
														<TableCell>{law.law_order}</TableCell>
														<TableCell>{law.law_type || "—"}</TableCell>
														<TableCell>{law.law_name || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{/* Law decisions (from KVA variant) */}
							{detail.law_decision_text && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<GavelIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.lawDecisions", "Lakipäätökset")}
										</Typography>
									</Stack>
									<Box
										sx={{
											p: 2,
											backgroundColor: colors.backgroundSubtle,
											borderRadius: 1,
											borderLeft: `4px solid ${getOutcomeColor(detail.decision_outcome_code)}`,
										}}
									>
										<Typography
											variant="body2"
											sx={{
												color: colors.textPrimary,
												whiteSpace: "pre-wrap",
											}}
										>
											{detail.law_decision_text}
										</Typography>
									</Box>
								</Box>
							)}

							{/* Stages */}
							{detail.stages.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<TimelineIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.stages", "Käsittelyvaiheet")}
										</Typography>
									</Stack>
									<Stack spacing={1.5}>
										{detail.stages.map((stage, idx) => (
											<Box
												key={idx}
												sx={{
													pl: 2,
													borderLeft: `3px solid ${colors.primary}`,
												}}
											>
												<Typography
													variant="body2"
													sx={{ fontWeight: 500, color: colors.textPrimary }}
												>
													{stage.stage_title || "—"}
												</Typography>
												{stage.event_date && (
													<Typography
														variant="caption"
														sx={{ color: colors.textSecondary }}
													>
														{formatDate(stage.event_date)}
													</Typography>
												)}
												{stage.event_title && stage.event_title !== stage.stage_title && (
													<Typography
														variant="body2"
														sx={{ mt: 0.25, color: colors.textPrimary, fontWeight: 400 }}
													>
														{stage.event_title}
													</Typography>
												)}
												{stage.event_description && (
													<Typography
														variant="body2"
														sx={{ mt: 0.5, color: colors.textSecondary }}
													>
														{stage.event_description}
													</Typography>
												)}
											</Box>
										))}
									</Stack>
								</Box>
							)}

								{/* Summary text */}
								{(detail.summary_text || detail.summary_rich_text) && (
									<Box>
										<Button
											startIcon={<ArticleIcon />}
											onClick={() => setShowSummary(!showSummary)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
											{showSummary
												? t("documents.hideSummary", "Piilota tiivistelmä")
												: t("documents.showSummary", "Näytä tiivistelmä")}
										</Button>
										<Collapse in={showSummary}>
											<Box
												sx={{
													p: 2,
													backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.summary_rich_text}
													fallbackText={detail.summary_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{/* Proposal text (ponsi) */}
								{(detail.proposal_text || detail.proposal_rich_text) && (
									<Box>
										<Button
											startIcon={<GavelIcon />}
											onClick={() => setShowProposalText(!showProposalText)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
											{showProposalText
												? t("documents.hideProposalText", "Piilota esitysteksti")
												: t("documents.showProposalText", "Näytä esitysteksti")}
										</Button>
										<Collapse in={showProposalText}>
											<Box
												sx={{
													p: 2,
													backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.proposal_rich_text}
													fallbackText={detail.proposal_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

							<DocumentLifecycle
								currentIdentifier={item.parliament_identifier}
								directReferenceValues={[
									...detail.stages.map((stage) => stage.stage_title),
									...detail.stages.map((stage) => stage.event_title),
									...detail.stages.map((stage) => stage.event_description),
								]}
								richTextValues={[
									detail.summary_rich_text,
									detail.justification_rich_text,
									detail.proposal_rich_text,
									detail.appendix_rich_text,
								]}
							/>

							<InlineRelatedSessions sessions={detail.sessions} />

							<RelatedVotings identifiers={[item.parliament_identifier]} />
						</Stack>
					)}
				</Box>
			</Collapse>
		</DataCard>
	);
}

// ─── Written question types and card ───

interface WrittenQuestionListItem {
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
}

interface WrittenQuestionDetail {
	id: number;
	parliament_identifier: string;
	document_number: number;
	parliamentary_year: string;
	title: string | null;
	submission_date: string | null;
	question_text: string | null;
	question_rich_text: string | null;
	answer_parliament_identifier: string | null;
	answer_minister_title: string | null;
	answer_minister_first_name: string | null;
	answer_minister_last_name: string | null;
	answer_date: string | null;
	decision_outcome: string | null;
	decision_outcome_code: string | null;
	signers: Array<{
		signer_order: number;
		is_first_signer: number;
		first_name: string | null;
		last_name: string | null;
		party: string | null;
	}>;
	stages: Array<{
		stage_title: string | null;
		stage_code: string | null;
		event_date: string | null;
		event_title: string | null;
		event_description: string | null;
	}>;
	subjects: Array<{ subject_text: string }>;
	sessions: Array<{
		session_key: string;
		session_date: string;
		session_type: string;
		session_number: number;
		session_year: string;
		section_title: string | null;
		section_key: string;
	}>;
}

interface OralQuestionListItem {
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
}

interface OralQuestionDetail {
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
	stages: Array<{
		stage_order: number;
		stage_title: string;
		stage_code: string | null;
		event_date: string | null;
		event_title: string | null;
		event_description: string | null;
	}>;
	subjects: Array<{ subject_text: string; yso_uri: string | null }>;
	sessions: Array<{
		session_key: string;
		session_date: string;
		session_type: string;
		session_number: number;
		session_year: string;
		section_title: string | null;
		section_key: string;
	}>;
}

function OralQuestionCard({ item }: { item: OralQuestionListItem }) {
	const { t } = useTranslation();

	const [expanded, setExpanded] = useState(false);
	const [detail, setDetail] = useState<OralQuestionDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showQuestionText, setShowQuestionText] = useState(false);

	const subjects = item.subjects
		? item.subjects.split("||").filter(Boolean)
		: [];
	const displaySubjects = subjects.slice(0, 3);
	const remainingSubjects = subjects.length - 3;

	const handleExpand = async () => {
		if (!expanded && !detail) {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/oral-questions/${item.id}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				setDetail(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load");
			} finally {
				setLoading(false);
			}
		}
		setExpanded(!expanded);
	};

	return (
		<DataCard>
			<Box
				sx={{
					cursor: "pointer",
					"&:hover": {
						backgroundColor: colors.backgroundSubtle,
					},
					transition: "background-color 0.2s",
					p: 2,
				}}
				onClick={handleExpand}
			>
				<Stack spacing={1.5}>
					<Stack
						direction="row"
						spacing={1}
						alignItems="flex-start"
						flexWrap="wrap"
					>
						<Typography
							variant="h6"
							sx={{
								flex: 1,
								minWidth: "200px",
								color: colors.textPrimary,
								fontWeight: 500,
							}}
						>
							{item.title || t("documents.noTitle", "Ei otsikkoa")}
						</Typography>
						<Chip
							label={item.parliament_identifier}
							size="small"
							sx={{
								backgroundColor: colors.primaryLight,
								color: colors.primary,
								fontWeight: 500,
							}}
						/>
					</Stack>

					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						flexWrap="wrap"
						alignItems={{ xs: "flex-start", sm: "center" }}
					>
						{item.submission_date && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.submissionDate", "Jättöpäivä")}:{" "}
								{formatDate(item.submission_date)}
							</Typography>
						)}

						{item.asker_text && (
							<Typography variant="body2" color={colors.textSecondary}>
								{item.asker_text}
							</Typography>
						)}

						{item.decision_outcome && (
							<Chip
								label={item.decision_outcome}
								size="small"
								sx={{
									backgroundColor: getOutcomeColor(item.decision_outcome_code),
									color: "#fff",
									fontWeight: 500,
								}}
							/>
						)}
					</Stack>

					{subjects.length > 0 && (
						<Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
							{displaySubjects.map((subject, idx) => (
								<Chip
									key={idx}
									label={subject}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							))}
							{remainingSubjects > 0 && (
								<Chip
									label={`+${remainingSubjects}`}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							)}
						</Stack>
					)}
				</Stack>

				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 1,
						transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
						transition: "transform 0.2s",
					}}
				>
					<ExpandMoreIcon sx={{ color: colors.textSecondary }} />
				</Box>
			</Box>

			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<Box sx={{ px: 2, pb: 2 }}>
					{loading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
							<CircularProgress size={24} />
						</Box>
					)}

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{t("documents.loadError", "Virhe ladattaessa tietoja")}: {error}
						</Alert>
					)}

						{detail && (
							<Stack spacing={2}>
								{detail.question_text && (
									<Box>
										<Button
											startIcon={<ArticleIcon />}
											onClick={() => setShowQuestionText(!showQuestionText)}
											sx={{ textTransform: "none", color: colors.primary, mb: 1 }}
										>
											{showQuestionText
												? t("documents.hideQuestion", "Piilota kysymys")
												: t("documents.showQuestion", "Näytä kysymys")}
										</Button>
										<Collapse in={showQuestionText}>
											<Box
												sx={{
													p: 2,
													backgroundColor: colors.backgroundSubtle,
													borderRadius: 1,
													borderLeft: `4px solid ${colors.info}`,
												}}
											>
												<Typography
													variant="body2"
													sx={{
														color: colors.textPrimary,
														whiteSpace: "pre-wrap",
													}}
												>
													{detail.question_text}
												</Typography>
											</Box>
										</Collapse>
									</Box>
								)}

							<DocumentLifecycle
								currentIdentifier={item.parliament_identifier}
								directReferenceValues={[
									...detail.stages.map((stage) => stage.stage_title),
									...detail.stages.map((stage) => stage.event_title),
									...detail.stages.map((stage) => stage.event_description),
								]}
							/>

							<InlineRelatedSessions sessions={detail.sessions} />

							<RelatedVotings identifiers={[item.parliament_identifier]} />
						</Stack>
					)}
				</Box>
			</Collapse>
		</DataCard>
	);
}

function WrittenQuestionCard({ item }: { item: WrittenQuestionListItem }) {
	const { t } = useTranslation();

	const [expanded, setExpanded] = useState(false);
	const [detail, setDetail] = useState<WrittenQuestionDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showQuestionText, setShowQuestionText] = useState(false);

	const subjects = item.subjects
		? item.subjects.split("||").filter(Boolean)
		: [];
	const displaySubjects = subjects.slice(0, 3);
	const remainingSubjects = subjects.length - 3;

	const signerName = [item.first_signer_first_name, item.first_signer_last_name]
		.filter(Boolean)
		.join(" ");
	const signerLabel = item.first_signer_party
		? `${signerName} (${item.first_signer_party})`
		: signerName;

	const answerMinisterName = [item.answer_minister_first_name, item.answer_minister_last_name]
		.filter(Boolean)
		.join(" ");

	const handleExpand = async () => {
		if (!expanded && !detail) {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/written-questions/${item.id}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				setDetail(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load");
			} finally {
				setLoading(false);
			}
		}
		setExpanded(!expanded);
	};

	return (
		<DataCard>
			<Box
				sx={{
					cursor: "pointer",
					"&:hover": {
						backgroundColor: colors.backgroundSubtle,
					},
					transition: "background-color 0.2s",
					p: 2,
				}}
				onClick={handleExpand}
			>
				<Stack spacing={1.5}>
					{/* Title row */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="flex-start"
						flexWrap="wrap"
					>
						<Typography
							variant="h6"
							sx={{
								flex: 1,
								minWidth: "200px",
								color: colors.textPrimary,
								fontWeight: 500,
							}}
						>
							{item.title || t("documents.noTitle", "Ei otsikkoa")}
						</Typography>
						<Chip
							label={item.parliament_identifier}
							size="small"
							sx={{
								backgroundColor: colors.primaryLight,
								color: colors.primary,
								fontWeight: 500,
							}}
						/>
					</Stack>

					{/* Metadata row */}
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						flexWrap="wrap"
						alignItems={{ xs: "flex-start", sm: "center" }}
					>
						{item.submission_date && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.submissionDate", "Jättöpäivä")}:{" "}
								{formatDate(item.submission_date)}
							</Typography>
						)}

						{signerLabel && (
							<Stack direction="row" spacing={0.5} alignItems="center">
								<PersonIcon
									fontSize="small"
									sx={{ color: colors.textSecondary }}
								/>
								<Typography variant="body2" color={colors.textSecondary}>
									{signerLabel}
								</Typography>
								{item.co_signer_count != null && item.co_signer_count > 0 && (
									<Typography variant="body2" color={colors.textSecondary}>
										{` +${item.co_signer_count}`}
									</Typography>
								)}
							</Stack>
						)}

						{answerMinisterName && (
							<Stack direction="row" spacing={0.5} alignItems="center">
								<GavelIcon
									fontSize="small"
									sx={{ color: colors.textSecondary }}
								/>
								<Typography variant="body2" color={colors.textSecondary}>
									{item.answer_minister_title ? `${item.answer_minister_title} ` : ""}
									{answerMinisterName}
									{item.answer_date ? ` (${formatDate(item.answer_date)})` : ""}
								</Typography>
							</Stack>
						)}

						{item.decision_outcome && (
							<Chip
								label={item.decision_outcome}
								size="small"
								sx={{
									backgroundColor: getOutcomeColor(item.decision_outcome_code),
									color: "#fff",
									fontWeight: 500,
								}}
							/>
						)}
					</Stack>

					{/* Subjects */}
					{subjects.length > 0 && (
						<Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
							{displaySubjects.map((subject, idx) => (
								<Chip
									key={idx}
									label={subject}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							))}
							{remainingSubjects > 0 && (
								<Chip
									label={`+${remainingSubjects}`}
									size="small"
									variant="outlined"
									sx={{
										borderColor: colors.dataBorder,
										color: colors.textSecondary,
									}}
								/>
							)}
						</Stack>
					)}
				</Stack>

				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 1,
					}}
				>
					<ExpandMoreIcon
						sx={{
							transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
							transition: "transform 0.3s",
							color: colors.textSecondary,
						}}
					/>
				</Box>
			</Box>

			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<Box sx={{ p: 2, pt: 0, borderTop: `1px solid ${colors.dataBorder}` }}>
					{loading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
							<CircularProgress size={32} />
						</Box>
					)}

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					{detail && (
						<Stack spacing={3}>
							{detail.signers.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<PersonIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.signers", "Allekirjoittajat")}
										</Typography>
									</Stack>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>#</TableCell>
													<TableCell>{t("documents.author", "Tekijä")}</TableCell>
													<TableCell>{t("party", "Puolue")}</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{detail.signers.map((signer, idx) => (
													<TableRow key={idx}>
														<TableCell>
															<Stack
																direction="row"
																spacing={0.5}
																alignItems="center"
															>
																{idx + 1}
																{signer.is_first_signer === 1 && (
																	<Chip
																		label={t(
																			"documents.firstSigner",
																			"Ensimmäinen",
																		)}
																		size="small"
																		sx={{
																			height: 20,
																			fontSize: "0.7rem",
																			backgroundColor: colors.primaryLight,
																			color: colors.primary,
																		}}
																	/>
																)}
															</Stack>
														</TableCell>
														<TableCell>
															{[signer.first_name, signer.last_name]
																.filter(Boolean)
																.join(" ") || "—"}
														</TableCell>
														<TableCell>{signer.party || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{/* Answer minister info */}
							{detail.answer_minister_first_name && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<GavelIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.answerMinister", "Vastaaja")}
										</Typography>
									</Stack>
									<Box sx={{ pl: 2 }}>
										<Typography variant="body2" sx={{ color: colors.textPrimary }}>
											{detail.answer_minister_title && `${detail.answer_minister_title} `}
											{detail.answer_minister_first_name} {detail.answer_minister_last_name}
										</Typography>
										{detail.answer_date && (
											<Typography variant="caption" sx={{ color: colors.textSecondary }}>
												{formatDate(detail.answer_date)}
												{detail.answer_parliament_identifier && ` — ${detail.answer_parliament_identifier}`}
											</Typography>
										)}
									</Box>
								</Box>
							)}

							{detail.stages.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<TimelineIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.stages", "Käsittelyvaiheet")}
										</Typography>
									</Stack>
									<Stack spacing={1.5}>
										{detail.stages.map((stage, idx) => (
											<Box
												key={idx}
												sx={{
													pl: 2,
													borderLeft: `3px solid ${colors.primary}`,
												}}
											>
												<Typography
													variant="body2"
													sx={{ fontWeight: 500, color: colors.textPrimary }}
												>
													{stage.stage_title || "—"}
												</Typography>
												{stage.event_date && (
													<Typography
														variant="caption"
														sx={{ color: colors.textSecondary }}
													>
														{formatDate(stage.event_date)}
													</Typography>
												)}
												{stage.event_title && stage.event_title !== stage.stage_title && (
													<Typography
														variant="body2"
														sx={{ mt: 0.25, color: colors.textPrimary, fontWeight: 400 }}
													>
														{stage.event_title}
													</Typography>
												)}
												{stage.event_description && (
													<Typography
														variant="body2"
														sx={{ mt: 0.5, color: colors.textSecondary }}
													>
														{stage.event_description}
													</Typography>
												)}
											</Box>
										))}
									</Stack>
								</Box>
							)}

								{(detail.question_text || detail.question_rich_text) && (
									<Box>
									<Button
										startIcon={<ArticleIcon />}
										onClick={() => setShowQuestionText(!showQuestionText)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showQuestionText
											? t("documents.hideQuestionText", "Piilota kysymysteksti")
											: t("documents.showQuestionText", "Näytä kysymysteksti")}
									</Button>
									<Collapse in={showQuestionText}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.question_rich_text}
													fallbackText={detail.question_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

							{/* Subjects */}
							{detail.subjects.length > 0 && (
								<Box>
									<Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
										{detail.subjects.map((s, idx) => (
											<Chip
												key={idx}
												label={s.subject_text}
												size="small"
												variant="outlined"
												sx={{
													borderColor: colors.dataBorder,
													color: colors.textSecondary,
												}}
											/>
										))}
									</Stack>
								</Box>
							)}

							<DocumentLifecycle
								currentIdentifier={item.parliament_identifier}
								directReferenceValues={[
									detail.answer_parliament_identifier,
									...detail.stages.map((stage) => stage.stage_title),
									...detail.stages.map((stage) => stage.event_title),
									...detail.stages.map((stage) => stage.event_description),
								]}
								richTextValues={[detail.question_rich_text]}
							/>

							<InlineRelatedSessions sessions={detail.sessions} />

							<RelatedVotings identifiers={[item.parliament_identifier]} />
						</Stack>
					)}
				</Box>
			</Collapse>
		</DataCard>
	);
}

// ─── Committee report types and card ───

interface CommitteeReportListItem {
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
}

interface CommitteeReportDetail {
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
	members: Array<{
		member_order: number;
		person_id: number | null;
		first_name: string;
		last_name: string;
		party: string | null;
		role: string | null;
	}>;
	experts: Array<{
		expert_order: number;
		person_id: number | null;
		first_name: string | null;
		last_name: string | null;
		title: string | null;
		organization: string | null;
	}>;
	sessions: Array<{
		session_key: string;
		session_date: string;
		session_type: string;
		session_number: number;
		session_year: string;
		section_title: string | null;
		section_key: string;
	}>;
}

function CommitteeReportCard({ item }: { item: CommitteeReportListItem }) {
	const { t } = useTranslation();
	const reportKind = getCommitteeReportKind(item.report_type_code);
	const reportKindLabel = reportKind === "report"
		? t("documents.committeeReportTypeReport", "Mietintö")
		: reportKind === "statement"
			? t("documents.committeeReportTypeStatement", "Lausunto")
			: item.report_type_code;

	const [expanded, setExpanded] = useState(false);
	const [detail, setDetail] = useState<CommitteeReportDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [showSummary, setShowSummary] = useState(false);
	const [showReasoning, setShowReasoning] = useState(false);
	const [showDecision, setShowDecision] = useState(false);
	const [showLegislation, setShowLegislation] = useState(false);
	const [showMinority, setShowMinority] = useState(false);

	const handleExpand = async () => {
		if (!expanded && !detail) {
			setLoading(true);
			setError(null);
			try {
				const response = await fetch(`/api/committee-reports/${item.id}`);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}
				const data = await response.json();
				setDetail(data);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load");
			} finally {
				setLoading(false);
			}
		}
		setExpanded(!expanded);
	};

	return (
		<DataCard>
			<Box
				sx={{
					cursor: "pointer",
					"&:hover": {
						backgroundColor: colors.backgroundSubtle,
					},
					transition: "background-color 0.2s",
					p: 2,
				}}
				onClick={handleExpand}
			>
				<Stack spacing={1.5}>
					{/* Title row */}
					<Stack
						direction="row"
						spacing={1}
						alignItems="flex-start"
						flexWrap="wrap"
					>
						<Typography
							variant="h6"
							sx={{
								flex: 1,
								minWidth: "200px",
								color: colors.textPrimary,
								fontWeight: 500,
							}}
						>
							{item.title || t("documents.noTitle", "Ei otsikkoa")}
						</Typography>
						<Chip
							label={item.parliament_identifier}
							size="small"
							sx={{
								backgroundColor: colors.primaryLight,
								color: colors.primary,
								fontWeight: 500,
							}}
						/>
						<Chip
							label={reportKindLabel}
							size="small"
							variant="outlined"
							sx={{
								borderColor: colors.dataBorder,
								color: colors.textSecondary,
								fontWeight: 500,
							}}
						/>
					</Stack>

					{/* Metadata row */}
					<Stack
						direction={{ xs: "column", sm: "row" }}
						spacing={2}
						flexWrap="wrap"
						alignItems={{ xs: "flex-start", sm: "center" }}
					>
						{item.draft_date && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.submissionDate", "Jättöpäivä")}:{" "}
								{formatDate(item.draft_date)}
							</Typography>
						)}
						{item.signature_date && (
							<Typography variant="body2" color={colors.textSecondary}>
								{t("documents.signatureDate", "Allekirjoituspäivä")}:{" "}
								{formatDate(item.signature_date)}
							</Typography>
						)}

						{item.committee_name && (
							<Stack direction="row" spacing={0.5} alignItems="center">
								<GroupsIcon
									fontSize="small"
									sx={{ color: colors.textSecondary }}
								/>
								<Typography variant="body2" color={colors.textSecondary}>
									{item.committee_name}
								</Typography>
							</Stack>
						)}
						{item.recipient_committee && (
							<Chip
								label={`${t("documents.recipientCommittee", "Vastaanottava valiokunta")}: ${item.recipient_committee}`}
								size="small"
								variant="outlined"
								sx={{
									borderColor: colors.dataBorder,
									color: colors.textSecondary,
								}}
							/>
						)}

						{item.source_reference && (
							<Chip
								label={item.source_reference}
								size="small"
								variant="outlined"
								sx={{
									borderColor: colors.primaryLight,
									color: colors.primary,
									fontWeight: 500,
								}}
							/>
						)}
					</Stack>
				</Stack>

				<Box
					sx={{
						display: "flex",
						justifyContent: "center",
						mt: 1,
					}}
				>
					<ExpandMoreIcon
						sx={{
							transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
							transition: "transform 0.3s",
							color: colors.textSecondary,
						}}
					/>
				</Box>
			</Box>

			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<Box sx={{ p: 2, pt: 0, borderTop: `1px solid ${colors.dataBorder}` }}>
					{loading && (
						<Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
							<CircularProgress size={32} />
						</Box>
					)}

					{error && (
						<Alert severity="error" sx={{ mb: 2 }}>
							{error}
						</Alert>
					)}

					{detail && (
						<Stack spacing={3}>
							{/* Members */}
							{detail.members.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<GroupsIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.committeeMembers", "Valiokunnan jäsenet")}
										</Typography>
									</Stack>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>#</TableCell>
													<TableCell>{t("common.name", "Nimi")}</TableCell>
													<TableCell>{t("common.party", "Puolue")}</TableCell>
													<TableCell>{t("documents.committeeRole", "Rooli")}</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{detail.members.map((member, idx) => (
													<TableRow key={idx}>
														<TableCell>{idx + 1}</TableCell>
														<TableCell>
															{member.first_name} {member.last_name}
														</TableCell>
														<TableCell>{member.party || "—"}</TableCell>
														<TableCell>{member.role || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{/* Experts */}
							{detail.experts.length > 0 && (
								<Box>
									<Stack
										direction="row"
										spacing={1}
										alignItems="center"
										sx={{ mb: 1.5 }}
									>
										<SchoolIcon sx={{ color: colors.primary }} />
										<Typography
											variant="subtitle1"
											sx={{ fontWeight: 600, color: colors.textPrimary }}
										>
											{t("documents.committeeExperts", "Asiantuntijat")}
										</Typography>
									</Stack>
									<TableContainer>
										<Table size="small">
											<TableHead>
												<TableRow>
													<TableCell>#</TableCell>
													<TableCell>{t("common.name", "Nimi")}</TableCell>
													<TableCell>{t("documents.expertTitle", "Asema")}</TableCell>
													<TableCell>{t("documents.expertOrganization", "Organisaatio")}</TableCell>
												</TableRow>
											</TableHead>
											<TableBody>
												{detail.experts.map((expert, idx) => (
													<TableRow key={idx}>
														<TableCell>{idx + 1}</TableCell>
														<TableCell>
															{[expert.first_name, expert.last_name].filter(Boolean).join(" ") || "—"}
														</TableCell>
														<TableCell>{expert.title || "—"}</TableCell>
														<TableCell>{expert.organization || "—"}</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</TableContainer>
								</Box>
							)}

							{/* Summary text */}
								{(detail.summary_text || detail.summary_rich_text) && (
									<Box>
									<Button
										startIcon={<ArticleIcon />}
										onClick={() => setShowSummary(!showSummary)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showSummary
											? t("documents.hideSummary", "Piilota tiivistelmä")
											: t("documents.showSummary", "Näytä tiivistelmä")}
									</Button>
									<Collapse in={showSummary}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.summary_rich_text}
													fallbackText={detail.summary_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{/* Reasoning text */}
								{(
									detail.general_reasoning_text ||
									detail.general_reasoning_rich_text ||
									detail.detailed_reasoning_text ||
									detail.detailed_reasoning_rich_text
								) && (
									<Box>
									<Button
										startIcon={<ArticleIcon />}
										onClick={() => setShowReasoning(!showReasoning)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showReasoning
											? t("documents.hideJustification", "Piilota perustelut")
											: t("documents.showJustification", "Näytä perustelut")}
									</Button>
									<Collapse in={showReasoning}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<Stack spacing={1.5}>
													{(detail.general_reasoning_text || detail.general_reasoning_rich_text) && (
														<RichTextRenderer
															document={detail.general_reasoning_rich_text}
															fallbackText={detail.general_reasoning_text}
															paragraphVariant="body2"
														/>
													)}
													{(detail.detailed_reasoning_text || detail.detailed_reasoning_rich_text) && (
														<RichTextRenderer
															document={detail.detailed_reasoning_rich_text}
															fallbackText={detail.detailed_reasoning_text}
															paragraphVariant="body2"
														/>
													)}
												</Stack>
											</Box>
										</Collapse>
									</Box>
								)}

								{/* Decision text */}
								{(detail.decision_text || detail.decision_rich_text) && (
									<Box>
									<Button
										startIcon={<GavelIcon />}
										onClick={() => setShowDecision(!showDecision)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showDecision
											? t("documents.hideDecision", "Piilota päätösehdotus")
											: t("documents.showDecision", "Näytä päätösehdotus")}
									</Button>
									<Collapse in={showDecision}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.decision_rich_text}
													fallbackText={detail.decision_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{/* Legislation amendment text */}
								{(detail.legislation_amendment_text || detail.legislation_amendment_rich_text) && (
									<Box>
									<Button
										startIcon={<BalanceIcon />}
										onClick={() => setShowLegislation(!showLegislation)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showLegislation
											? t("documents.hideLegislation", "Piilota lakiehdotukset")
											: t("documents.showLegislation", "Näytä lakiehdotukset")}
									</Button>
									<Collapse in={showLegislation}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.primary}`,
											}}
										>
												<RichTextRenderer
													document={detail.legislation_amendment_rich_text}
													fallbackText={detail.legislation_amendment_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{/* Minority opinion */}
								{(detail.minority_opinion_text || detail.minority_opinion_rich_text) && (
									<Box>
									<Button
										startIcon={<PersonIcon />}
										onClick={() => setShowMinority(!showMinority)}
										sx={{
											textTransform: "none",
											color: colors.primary,
											mb: 1,
										}}
									>
										{showMinority
											? t("documents.hideMinority", "Piilota eriävä mielipide")
											: t("documents.showMinority", "Näytä eriävä mielipide")}
									</Button>
									<Collapse in={showMinority}>
										<Box
											sx={{
												p: 2,
												backgroundColor: colors.backgroundSubtle,
												borderRadius: 1,
												borderLeft: `4px solid ${colors.error}`,
											}}
										>
												<RichTextRenderer
													document={detail.minority_opinion_rich_text}
													fallbackText={detail.minority_opinion_text}
													paragraphVariant="body2"
												/>
											</Box>
										</Collapse>
									</Box>
								)}

								{/* Resolution text */}
								{(detail.resolution_text || detail.resolution_rich_text) && (
									<Box
									sx={{
										p: 2,
										backgroundColor: colors.backgroundSubtle,
										borderRadius: 1,
										borderLeft: `4px solid ${colors.primary}`,
									}}
								>
									<Typography
										variant="subtitle2"
										sx={{ fontWeight: 600, color: colors.textPrimary, mb: 1 }}
									>
										{t("documents.committeeResolution", "Lausumaehdotus")}
									</Typography>
										<RichTextRenderer
											document={detail.resolution_rich_text}
											fallbackText={detail.resolution_text}
											paragraphVariant="body2"
										/>
									</Box>
								)}

							<DocumentLifecycle
								currentIdentifier={item.parliament_identifier}
								directReferenceValues={[
									item.source_reference,
									detail.source_reference,
								]}
								richTextValues={[
									detail.summary_rich_text,
									detail.general_reasoning_rich_text,
									detail.detailed_reasoning_rich_text,
									detail.decision_rich_text,
									detail.legislation_amendment_rich_text,
									detail.minority_opinion_rich_text,
									detail.resolution_rich_text,
								]}
							/>

							<InlineRelatedSessions sessions={detail.sessions} />

							<RelatedVotings identifiers={[item.parliament_identifier, item.source_reference].filter(Boolean) as string[]} />
						</Stack>
					)}
				</Box>
			</Collapse>
		</DataCard>
	);
}

// ─── Main Documents page ───

export default function Documents() {
	const { t } = useTranslation();

	// State
	const [documentType, setDocumentType] = useState<DocumentType>("interpellations");
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selectedYear, setSelectedYear] = useState<string>("all");
	const [page, setPage] = useState(1);
	const [items, setItems] = useState<
		(
			| InterpellationListItem
			| GovernmentProposalListItem
			| WrittenQuestionListItem
			| OralQuestionListItem
			| CommitteeReportListItem
			| LegislativeInitiativeListItem
		)[]
	>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [loading, setLoading] = useState(false);
	const [years, setYears] = useState<number[]>([]);
	const [yearsLoading, setYearsLoading] = useState(true);
	const [selectedSourceCommittee, setSelectedSourceCommittee] = useState("all");
	const [selectedRecipientCommittee, setSelectedRecipientCommittee] = useState("all");
	const [sourceCommittees, setSourceCommittees] = useState<
		Array<{ committee_name: string; count: number }>
	>([]);
	const [recipientCommittees, setRecipientCommittees] = useState<
		Array<{ committee_name: string; count: number }>
	>([]);
	const [committeeFiltersLoading, setCommitteeFiltersLoading] = useState(false);

	const limit = 20;

	const { apiBase, initiativeTypeCode } = getDocumentApiConfig(documentType);
	const isLegislativeInitiativeType = initiativeTypeCode !== null;

	// Debounce search query
	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedQuery(searchQuery);
		}, 300);
		return () => clearTimeout(timer);
	}, [searchQuery]);

	// Fetch years when document type changes
	useEffect(() => {
		const fetchYears = async () => {
			setYearsLoading(true);
			try {
				const params = new URLSearchParams();
				if (initiativeTypeCode) {
					params.set("initiativeTypeCode", initiativeTypeCode);
				}
				const yearsUrl = `${apiBase}/years${params.toString() ? `?${params}` : ""}`;
				const response = await fetch(yearsUrl);
				if (!response.ok) throw new Error("Failed to fetch years");
				const data = await response.json();
				setYears(data.map((item: { year: number }) => item.year));
			} catch (err) {
				console.error("Error fetching years:", err);
			} finally {
				setYearsLoading(false);
			}
		};
		fetchYears();
	}, [apiBase, initiativeTypeCode]);

	// Fetch documents
	const fetchDocuments = useCallback(
		async (pageNum: number, append = false) => {
			setLoading(true);
			try {
				const params = new URLSearchParams({
					page: pageNum.toString(),
					limit: limit.toString(),
				});
				if (debouncedQuery) params.set("q", debouncedQuery);
				if (selectedYear !== "all") params.set("year", selectedYear);
				if (initiativeTypeCode) {
					params.set("initiativeTypeCode", initiativeTypeCode);
				}
				if (documentType === "committee-reports") {
					if (selectedSourceCommittee !== "all") {
						params.set("sourceCommittee", selectedSourceCommittee);
					}
					if (selectedRecipientCommittee !== "all") {
						params.set("recipientCommittee", selectedRecipientCommittee);
					}
				}

				const response = await fetch(`${apiBase}?${params}`);
				if (!response.ok) throw new Error("Failed to fetch documents");

				const data = await response.json();
				setItems(append ? [...items, ...data.items] : data.items);
				setTotalCount(data.totalCount);
				setTotalPages(data.totalPages);
			} catch (err) {
				console.error("Error fetching documents:", err);
			} finally {
				setLoading(false);
			}
		},
		[
			debouncedQuery,
			selectedYear,
			items,
			apiBase,
			initiativeTypeCode,
			documentType,
			selectedSourceCommittee,
			selectedRecipientCommittee,
		],
	);

	// Reset and fetch on filter change
	useEffect(() => {
		setPage(1);
		fetchDocuments(1, false);
	}, [
		debouncedQuery,
		selectedYear,
		apiBase,
		initiativeTypeCode,
		documentType,
		selectedSourceCommittee,
		selectedRecipientCommittee,
	]);

	useEffect(() => {
		if (documentType !== "committee-reports") {
			setSourceCommittees([]);
			setRecipientCommittees([]);
			setCommitteeFiltersLoading(false);
			return;
		}

		const sourceParams = new URLSearchParams();
		if (debouncedQuery) sourceParams.set("q", debouncedQuery);
		if (selectedYear !== "all") sourceParams.set("year", selectedYear);
		if (selectedRecipientCommittee !== "all") {
			sourceParams.set("recipientCommittee", selectedRecipientCommittee);
		}

		const recipientParams = new URLSearchParams();
		if (debouncedQuery) recipientParams.set("q", debouncedQuery);
		if (selectedYear !== "all") recipientParams.set("year", selectedYear);
		if (selectedSourceCommittee !== "all") {
			recipientParams.set("sourceCommittee", selectedSourceCommittee);
		}

		const sourceUrl =
			`/api/committee-reports/source-committees${sourceParams.toString() ? `?${sourceParams}` : ""}`;
		const recipientUrl =
			`/api/committee-reports/recipient-committees${recipientParams.toString() ? `?${recipientParams}` : ""}`;

		setCommitteeFiltersLoading(true);
		Promise.all([
			fetch(sourceUrl).then((response) => {
				if (!response.ok) throw new Error("Failed to fetch source committees");
				return response.json();
			}),
			fetch(recipientUrl).then((response) => {
				if (!response.ok) throw new Error("Failed to fetch recipient committees");
				return response.json();
			}),
		])
			.then(([sourceData, recipientData]) => {
				setSourceCommittees(sourceData);
				setRecipientCommittees(recipientData);
				if (
					selectedSourceCommittee !== "all" &&
					!sourceData.some(
						(item: { committee_name: string }) =>
							item.committee_name === selectedSourceCommittee,
					)
				) {
					setSelectedSourceCommittee("all");
				}
				if (
					selectedRecipientCommittee !== "all" &&
					!recipientData.some(
						(item: { committee_name: string }) =>
							item.committee_name === selectedRecipientCommittee,
					)
				) {
					setSelectedRecipientCommittee("all");
				}
			})
			.catch((err) => {
				console.error("Error fetching committee filters:", err);
				setSourceCommittees([]);
				setRecipientCommittees([]);
			})
			.finally(() => {
				setCommitteeFiltersLoading(false);
			});
	}, [
		documentType,
		debouncedQuery,
		selectedYear,
		selectedSourceCommittee,
		selectedRecipientCommittee,
	]);

	// Reset filters when document type changes
	const handleDocumentTypeChange = (newType: DocumentType) => {
		setDocumentType(newType);
		setSelectedYear("all");
		setSelectedSourceCommittee("all");
		setSelectedRecipientCommittee("all");
		setSourceCommittees([]);
		setRecipientCommittees([]);
		setSearchQuery("");
		setDebouncedQuery("");
		setItems([]);
		setTotalCount(0);
		setTotalPages(0);
		setPage(1);
	};

	// Load more handler
	const handleLoadMore = () => {
		const nextPage = page + 1;
		setPage(nextPage);
		fetchDocuments(nextPage, true);
	};

	return (
		<Box sx={{ p: { xs: 2, md: 3 } }}>
			<PageHeader
				title={t("documents.title")}
				subtitle={t("documents.subtitle")}
			/>

			<Stack spacing={3}>
				{/* Search field */}
				<TextField
					fullWidth
					placeholder={t("documents.searchPlaceholder")}
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					InputProps={{
						startAdornment: (
							<InputAdornment position="start">
								<SearchIcon sx={{ color: colors.textSecondary }} />
							</InputAdornment>
						),
					}}
					sx={{
						backgroundColor: colors.backgroundDefault,
						"& .MuiOutlinedInput-root": {
							"& fieldset": {
								borderColor: colors.dataBorder,
							},
						},
					}}
				/>

				{/* Filter row */}
				<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
					<FormControl fullWidth>
						<InputLabel>{t("documents.type")}</InputLabel>
						<Select
							value={documentType}
							label={t("documents.type")}
							onChange={(e) => handleDocumentTypeChange(e.target.value as DocumentType)}
							sx={{
								backgroundColor: colors.backgroundDefault,
							}}
						>
							<MenuItem value="interpellations">
								{t("documents.interpellations", "Välikysymykset")}
							</MenuItem>
							<MenuItem value="government-proposals">
								{t("documents.governmentProposals", "Hallituksen esitykset")}
							</MenuItem>
							<MenuItem value="written-questions">
								{t("documents.writtenQuestions", "Kirjalliset kysymykset")}
							</MenuItem>
							<MenuItem value="oral-questions">
								{t("documents.oralQuestions", "Suulliset kysymykset")}
							</MenuItem>
							<MenuItem value="committee-reports">
								{t("documents.committeeReports", "Valiokunnan mietinnöt")}
							</MenuItem>
							<MenuItem value="legislative-initiatives-law">
								{t("documents.legislativeInitiativesLaw", "Lakialoitteet")}
							</MenuItem>
							<MenuItem value="legislative-initiatives-budget">
								{t("documents.legislativeInitiativesBudget", "Talousarvioaloitteet")}
							</MenuItem>
							<MenuItem value="legislative-initiatives-supplementary-budget">
								{t(
									"documents.legislativeInitiativesSupplementaryBudget",
									"Lisätalousarvioaloitteet",
								)}
							</MenuItem>
							<MenuItem value="legislative-initiatives-action">
								{t("documents.legislativeInitiativesAction", "Toimenpidealoitteet")}
							</MenuItem>
							<MenuItem value="legislative-initiatives-discussion">
								{t("documents.legislativeInitiativesDiscussion", "Keskustelualoitteet")}
							</MenuItem>
							<MenuItem value="legislative-initiatives-citizens">
								{t("documents.legislativeInitiativesCitizens", "Kansalaisaloitteet")}
							</MenuItem>
						</Select>
					</FormControl>

					<FormControl fullWidth>
						<InputLabel>{t("documents.year")}</InputLabel>
						<Select
							value={selectedYear}
							label={t("documents.year")}
							onChange={(e) => setSelectedYear(e.target.value)}
							disabled={yearsLoading}
							sx={{
								backgroundColor: colors.backgroundDefault,
							}}
						>
							<MenuItem value="all">{t("documents.allYears")}</MenuItem>
							{years.map((year) => (
								<MenuItem key={year} value={year.toString()}>
									{year}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Stack>

				{documentType === "committee-reports" && (
					<Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
						<FormControl fullWidth>
							<InputLabel>{t("documents.sourceCommitteeFilter", "Lähdevaliokunta")}</InputLabel>
							<Select
								value={selectedSourceCommittee}
								label={t("documents.sourceCommitteeFilter", "Lähdevaliokunta")}
								onChange={(e) => setSelectedSourceCommittee(e.target.value)}
								disabled={committeeFiltersLoading}
								sx={{
									backgroundColor: colors.backgroundDefault,
								}}
							>
								<MenuItem value="all">
									{t("documents.allSourceCommittees", "Kaikki lähdevaliokunnat")}
								</MenuItem>
								{sourceCommittees.map((item) => (
									<MenuItem key={item.committee_name} value={item.committee_name}>
										{item.committee_name} ({item.count})
									</MenuItem>
								))}
							</Select>
						</FormControl>

						<FormControl fullWidth>
							<InputLabel>{t("documents.targetCommitteeFilter", "Vastaanottava valiokunta")}</InputLabel>
							<Select
								value={selectedRecipientCommittee}
								label={t("documents.targetCommitteeFilter", "Vastaanottava valiokunta")}
								onChange={(e) => setSelectedRecipientCommittee(e.target.value)}
								disabled={committeeFiltersLoading}
								sx={{
									backgroundColor: colors.backgroundDefault,
								}}
							>
								<MenuItem value="all">
									{t("documents.allTargetCommittees", "Kaikki vastaanottavat valiokunnat")}
								</MenuItem>
								{recipientCommittees.map((item) => (
									<MenuItem key={item.committee_name} value={item.committee_name}>
										{item.committee_name} ({item.count})
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Stack>
				)}

				{/* Result count */}
				<Typography variant="body2" color={colors.textSecondary}>
					{t("documents.showing")} {items.length} / {totalCount}{" "}
					{t("documents.totalDocuments", "asiakirjaa")}
				</Typography>

				{/* Results */}
				{loading && page === 1 ? (
					<Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
						<CircularProgress />
					</Box>
				) : items.length === 0 ? (
					<Box sx={{ textAlign: "center", py: 6 }}>
						<Typography variant="h6" color={colors.textSecondary}>
							{t("documents.noResults")}
						</Typography>
						<Typography variant="body2" color={colors.textSecondary}>
							{t("documents.noResultsDescription")}
						</Typography>
					</Box>
				) : (
					<Stack spacing={2}>
						{documentType === "interpellations"
							? (items as InterpellationListItem[]).map((item) => (
									<InterpellationCard key={item.id} item={item} />
								))
							: documentType === "government-proposals"
								? (items as GovernmentProposalListItem[]).map((item) => (
										<GovernmentProposalCard key={item.id} item={item} />
									))
								: documentType === "oral-questions"
									? (items as OralQuestionListItem[]).map((item) => (
											<OralQuestionCard key={item.id} item={item} />
										))
								: isLegislativeInitiativeType
									? (items as LegislativeInitiativeListItem[]).map((item) => (
											<LegislativeInitiativeCard key={item.id} item={item} />
										))
								: documentType === "committee-reports"
									? (items as CommitteeReportListItem[]).map((item) => (
											<CommitteeReportCard key={item.id} item={item} />
										))
									: (items as WrittenQuestionListItem[]).map((item) => (
											<WrittenQuestionCard key={item.id} item={item} />
										))}

						{/* Load more button */}
						{page < totalPages && (
							<Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
								<Button
									variant="outlined"
									onClick={handleLoadMore}
									disabled={loading}
									sx={{
										color: colors.primary,
										borderColor: colors.primary,
										"&:hover": {
											borderColor: colors.primary,
											backgroundColor: colors.primaryLight,
										},
									}}
								>
									{loading ? (
										<CircularProgress size={24} />
									) : (
										t("documents.loadMore")
									)}
								</Button>
							</Box>
						)}
					</Stack>
				)}
			</Stack>
		</Box>
	);
}
