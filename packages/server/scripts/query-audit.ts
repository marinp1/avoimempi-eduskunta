import {
  collectServerQueryAudit,
  summarizeQueryAudit,
} from "../database/query-audit";

const records = collectServerQueryAudit();
const summary = summarizeQueryAudit(records);

console.log(JSON.stringify({ summary, records }, null, 2));
