import { CreditReport, Tradeline } from "../types/credit-report";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function historyLegend(): string {
  return "History legend (most recent month first): C=paid as agreed, 1=30d late, 2=60d, 3=90d, 4=120d, 5=150d+/charge-off, -=not reported";
}

function renderTradeline(t: Tradeline): string {
  const lines = [
    `  ${t.creditor}  (${t.accountType.replace(/_/g, " ")})  Acct ${t.accountNumberMasked}`,
    `    Opened: ${t.openedDate}   Status: ${t.status.replace(/_/g, " ")}   Reported by: ${t.reportedBy.join(", ")}`,
    `    Balance: ${money(t.balance)}   Limit: ${t.creditLimit === null ? "N/A" : money(t.creditLimit)}   Past due: ${money(t.pastDueAmount)}`,
    `    24-month history: ${t.paymentHistory24Mo}`,
  ];
  if (t.remarks) lines.push(`    Remarks: ${t.remarks}`);
  return lines.join("\n");
}

export function renderCreditReport(report: CreditReport): string {
  const out: string[] = [];
  const rule = "=".repeat(78);

  out.push(rule);
  out.push("*** SAMPLE TRI-BUREAU CREDIT REPORT — FICTITIOUS TEST DATA ***");
  out.push(report.disclaimer);
  out.push(rule);
  out.push("");
  out.push(`Report ID: ${report.reportId}    Scenario: ${report.generatedFor}`);
  out.push("");
  out.push("CONSUMER INFORMATION");
  out.push(`  Name: ${report.consumer.name}`);
  out.push(`  DOB: ${report.consumer.dateOfBirth}   SSN: ${report.consumer.ssnMasked} (999 prefix = never issued)`);
  for (const addr of report.consumer.addresses) out.push(`  Address: ${addr}`);
  for (const emp of report.consumer.employers) out.push(`  Employer: ${emp}`);
  out.push("");
  out.push("CREDIT SCORES");
  out.push(`  Equifax: ${report.scores.equifax}   Experian: ${report.scores.experian}   TransUnion: ${report.scores.transunion}`);
  out.push("");
  out.push("SUMMARY");
  out.push(`  Total accounts: ${report.summary.totalAccounts}   Open: ${report.summary.openAccounts}   Derogatory: ${report.summary.derogatoryAccounts}`);
  out.push(`  Collections: ${report.summary.collectionsCount}   Public records: ${report.summary.publicRecordCount}   Hard inquiries: ${report.summary.hardInquiries}`);
  out.push(`  Total balance: ${money(report.summary.totalBalance)}   Revolving utilization: ${report.summary.revolvingUtilizationPct}%`);
  out.push("");

  out.push(`TRADELINES (${report.tradelines.length})`);
  out.push(historyLegend());
  for (const t of report.tradelines) {
    out.push("");
    out.push(renderTradeline(t));
  }
  out.push("");

  out.push(`COLLECTIONS (${report.collections.length})`);
  for (const c of report.collections) {
    out.push(`  ${c.agency} for ${c.originalCreditor}  Acct ${c.accountNumberMasked}  [${c.collectionType}]`);
    out.push(`    Placed: ${c.placedDate}   Original: ${money(c.originalAmount)}   Balance: ${money(c.currentBalance)}   Status: ${c.status}`);
  }
  if (report.collections.length === 0) out.push("  None reported.");
  out.push("");

  out.push(`PUBLIC RECORDS (${report.publicRecords.length})`);
  for (const p of report.publicRecords) {
    out.push(`  ${p.recordType.replace(/_/g, " ")}  Filed: ${p.filedDate}  Status: ${p.status}  Ref: ${p.referenceNumber}`);
    out.push(`    Court: ${p.court}   Amount: ${p.amount === null ? "N/A" : money(p.amount)}   Resolved: ${p.resolvedDate ?? "—"}`);
  }
  if (report.publicRecords.length === 0) out.push("  None reported.");
  out.push("");

  out.push(`INQUIRIES (${report.inquiries.length})`);
  for (const i of report.inquiries) {
    out.push(`  ${i.date}  ${i.creditor}  (${i.inquiryType})`);
  }
  if (report.inquiries.length === 0) out.push("  None reported.");
  out.push("");
  out.push(rule);
  out.push("END OF SAMPLE REPORT — FICTITIOUS TEST DATA");
  out.push(rule);

  return out.join("\n");
}
