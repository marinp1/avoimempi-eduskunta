/**
 * Render harness (no server): builds VotingService against the real DB and
 * renders the voting detail page for sample votings to verify the new
 * statement proposal section.
 */
import "#server/i18n";
import { Database } from "bun:sqlite";
import { VotingRepository } from "#server/features/voting/voting.repository";
import { VotingService } from "#server/features/voting/voting.service";
import { ProvenanceService } from "#server/domain/provenance.service";
import Aanestys from "#server/features/voting/pages/detail.page";

const DB_PATH = "/workspaces/avoimempi-eduskunta/avoimempi-eduskunta.db";
const db = new Database(DB_PATH, { readonly: true });

const provenanceService = new ProvenanceService(null);
const votingService = new VotingService(
  new VotingRepository(db),
  provenanceService,
);

const ids = process.argv.slice(2);
for (const id of ids) {
  const data = votingService.getVotingDetail(id);
  if (!data) {
    console.log(`=== voting ${id}: NOT FOUND ===`);
    continue;
  }
  const html = String(Aanestys({ data }));
  const spJson = JSON.stringify(data.statementProposal, null, 2);
  console.log(`=== voting ${id}: ${data.vote.title} ===`);
  console.log(`yesProposition: ${data.vote.yesProposition}`);
  console.log(`noProposition:  ${data.vote.noProposition}`);
  console.log(`statementProposal: ${spJson}`);
  console.log(
    `page contains lausumaehdotus section: ${html.includes("Lausumaehdotus · mistä äänestettiin")}`,
  );
  const start = html.indexOf("Lausumaehdotus · mistä äänestettiin");
  if (start >= 0) {
    console.log(html.slice(start - 200, start + 1200));
  }
  console.log("");
}
db.close();
