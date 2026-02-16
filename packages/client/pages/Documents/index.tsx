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
} from "@mui/icons-material";
import { RelatedVotings } from "#client/components/DocumentCards";
import { DataCard, PageHeader } from "#client/theme/components";
import { colors } from "#client/theme/index";

type DocumentType = "interpellations" | "government-proposals" | "written-questions";

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
	resolution_text: string | null;
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

							{detail.question_text && (
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

							{detail.resolution_text && (
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
											<Typography
												variant="body2"
												sx={{
													color: colors.textPrimary,
													whiteSpace: "pre-wrap",
												}}
											>
												{detail.resolution_text}
											</Typography>
										</Box>
									</Collapse>
								</Box>
							)}

							{detail.sessions.length > 0 && (
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
										{detail.sessions.map((session, idx) => (
											<Box
												key={idx}
												sx={{
													pl: 2,
													borderLeft: `3px solid ${colors.primary}`,
													cursor: "pointer",
													"&:hover": { backgroundColor: colors.backgroundSubtle },
													borderRadius: 1,
													py: 0.5,
												}}
												onClick={() => {
													window.history.pushState({}, "", `/istunnot?date=${session.session_date}`);
													window.dispatchEvent(new PopStateEvent("popstate"));
												}}
											>
												<Typography
													variant="body2"
													sx={{ fontWeight: 500, color: colors.primary }}
												>
													{session.session_type} {session.session_number}/{session.session_year} — {formatDate(session.session_date)}
												</Typography>
												{session.section_title && (
													<Typography
														variant="caption"
														sx={{ color: colors.textSecondary }}
													>
														{session.section_title}
													</Typography>
												)}
											</Box>
										))}
									</Stack>
								</Box>
							)}

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
	justification_text: string | null;
	proposal_text: string | null;
	appendix_text: string | null;
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
							{detail.summary_text && (
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
											<Typography
												variant="body2"
												sx={{
													color: colors.textPrimary,
													whiteSpace: "pre-wrap",
												}}
											>
												{detail.summary_text}
											</Typography>
										</Box>
									</Collapse>
								</Box>
							)}

							{/* Proposal text (ponsi) */}
							{detail.proposal_text && (
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
											<Typography
												variant="body2"
												sx={{
													color: colors.textPrimary,
													whiteSpace: "pre-wrap",
												}}
											>
												{detail.proposal_text}
											</Typography>
										</Box>
									</Collapse>
								</Box>
							)}

							{/* Related sessions */}
							{detail.sessions.length > 0 && (
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
										{detail.sessions.map((session, idx) => (
											<Box
												key={idx}
												sx={{
													pl: 2,
													borderLeft: `3px solid ${colors.primary}`,
													cursor: "pointer",
													"&:hover": { backgroundColor: colors.backgroundSubtle },
													borderRadius: 1,
													py: 0.5,
												}}
												onClick={() => {
													window.history.pushState({}, "", `/istunnot?date=${session.session_date}`);
													window.dispatchEvent(new PopStateEvent("popstate"));
												}}
											>
												<Typography
													variant="body2"
													sx={{ fontWeight: 500, color: colors.primary }}
												>
													{session.session_type} {session.session_number}/{session.session_year} — {formatDate(session.session_date)}
												</Typography>
												{session.section_title && (
													<Typography
														variant="caption"
														sx={{ color: colors.textSecondary }}
													>
														{session.section_title}
													</Typography>
												)}
											</Box>
										))}
									</Stack>
								</Box>
							)}

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

							{detail.question_text && (
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

							{/* Related sessions */}
							{detail.sessions.length > 0 && (
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
										{detail.sessions.map((session, idx) => (
											<Box
												key={idx}
												sx={{
													pl: 2,
													borderLeft: `3px solid ${colors.primary}`,
													cursor: "pointer",
													"&:hover": { backgroundColor: colors.backgroundSubtle },
													borderRadius: 1,
													py: 0.5,
												}}
												onClick={() => {
													window.history.pushState({}, "", `/istunnot?date=${session.session_date}`);
													window.dispatchEvent(new PopStateEvent("popstate"));
												}}
											>
												<Typography
													variant="body2"
													sx={{ fontWeight: 500, color: colors.primary }}
												>
													{session.session_type} {session.session_number}/{session.session_year} — {formatDate(session.session_date)}
												</Typography>
												{session.section_title && (
													<Typography
														variant="caption"
														sx={{ color: colors.textSecondary }}
													>
														{session.section_title}
													</Typography>
												)}
											</Box>
										))}
									</Stack>
								</Box>
							)}

							<RelatedVotings identifiers={[item.parliament_identifier]} />
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
	const [items, setItems] = useState<(InterpellationListItem | GovernmentProposalListItem | WrittenQuestionListItem)[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [totalPages, setTotalPages] = useState(0);
	const [loading, setLoading] = useState(false);
	const [years, setYears] = useState<number[]>([]);
	const [yearsLoading, setYearsLoading] = useState(true);

	const limit = 20;

	const apiBase = documentType === "interpellations"
		? "/api/interpellations"
		: documentType === "government-proposals"
			? "/api/government-proposals"
			: "/api/written-questions";

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
				const response = await fetch(`${apiBase}/years`);
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
	}, [apiBase]);

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
		[debouncedQuery, selectedYear, items, apiBase],
	);

	// Reset and fetch on filter change
	useEffect(() => {
		setPage(1);
		fetchDocuments(1, false);
	}, [debouncedQuery, selectedYear, apiBase]);

	// Reset filters when document type changes
	const handleDocumentTypeChange = (newType: DocumentType) => {
		setDocumentType(newType);
		setSelectedYear("all");
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
