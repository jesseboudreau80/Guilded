import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import {
  CreditReport,
  Collection,
  Inquiry,
  PublicRecord,
  SYNTHETIC_DISCLAIMER,
  Tradeline,
  creditReportSchema,
  DEROGATORY_STATUSES,
} from "../types/credit-report";
import { renderCreditReport } from "./render-credit-report";

/**
 * Deterministic generator for the synthetic credit report fixtures in
 * fixtures/credit-reports/. Personas cover the derogatory-mark spectrum a
 * DIY credit-repair learner will encounter: late payments, collections,
 * charge-offs, repossession, judgments, liens, and both bankruptcy chapters.
 *
 * Run: npm run fixtures:generate
 */

/** Pad a payment-history prefix (most recent month first) with on-time months to 24 chars. */
function h(recentFirst: string): string {
  if (recentFirst.length > 24) throw new Error(`history too long: ${recentFirst}`);
  return recentFirst.padEnd(24, "C");
}

const OPEN_STATUSES = new Set(["CURRENT", "LATE_30", "LATE_60", "LATE_90", "LATE_120"]);
const REVOLVING = new Set(["CREDIT_CARD", "RETAIL_CARD", "LINE_OF_CREDIT"]);

function buildReport(input: {
  reportId: string;
  generatedFor: string;
  name: string;
  dateOfBirth: string;
  ssnLast4: string;
  addresses: string[];
  employers: string[];
  scores: { equifax: number; experian: number; transunion: number };
  tradelines: Tradeline[];
  collections: Collection[];
  publicRecords: PublicRecord[];
  inquiries: Inquiry[];
}): CreditReport {
  const { tradelines, collections, publicRecords, inquiries } = input;

  const revolvingWithLimit = tradelines.filter(
    (t) => REVOLVING.has(t.accountType) && t.creditLimit !== null && t.creditLimit > 0 && OPEN_STATUSES.has(t.status)
  );
  const limitSum = revolvingWithLimit.reduce((s, t) => s + (t.creditLimit ?? 0), 0);
  const revolvingBalance = revolvingWithLimit.reduce((s, t) => s + t.balance, 0);
  const utilization = limitSum === 0 ? 0 : Math.round((revolvingBalance / limitSum) * 1000) / 10;

  const report: CreditReport = {
    reportId: input.reportId,
    synthetic: true,
    disclaimer: SYNTHETIC_DISCLAIMER,
    generatedFor: input.generatedFor,
    consumer: {
      name: input.name,
      dateOfBirth: input.dateOfBirth,
      ssnMasked: `999-XX-${input.ssnLast4}`,
      addresses: input.addresses,
      employers: input.employers,
    },
    scores: input.scores,
    summary: {
      totalAccounts: tradelines.length,
      openAccounts: tradelines.filter((t) => OPEN_STATUSES.has(t.status)).length,
      derogatoryAccounts: tradelines.filter((t) => DEROGATORY_STATUSES.has(t.status)).length,
      collectionsCount: collections.length,
      publicRecordCount: publicRecords.length,
      hardInquiries: inquiries.filter((i) => i.inquiryType === "HARD").length,
      totalBalance:
        tradelines.reduce((s, t) => s + t.balance, 0) + collections.reduce((s, c) => s + c.currentBalance, 0),
      revolvingUtilizationPct: utilization,
    },
    tradelines,
    collections,
    publicRecords,
    inquiries,
  };

  return creditReportSchema.parse(report);
}

const TRI = ["EQUIFAX", "EXPERIAN", "TRANSUNION"] as const;

export const personas: CreditReport[] = [
  buildReport({
    reportId: "SAMPLE-0001",
    generatedFor: "clean-baseline (control persona, no derogatory marks)",
    name: "Jordan Sample",
    dateOfBirth: "1988-04-12",
    ssnLast4: "0001",
    addresses: ["123 Example Street, Springfield, US 00001"],
    employers: ["Acme Testing Co."],
    scores: { equifax: 782, experian: 789, transunion: 778 },
    tradelines: [
      {
        creditor: "Sample National Bank",
        accountNumberMasked: "XXXX-1001",
        accountType: "CREDIT_CARD",
        openedDate: "2016-03",
        status: "CURRENT",
        balance: 42000,
        creditLimit: 1200000,
        monthlyPayment: 3500,
        pastDueAmount: 0,
        paymentHistory24Mo: h(""),
        remarks: null,
        reportedBy: [...TRI],
      },
      {
        creditor: "Fixture Auto Finance",
        accountNumberMasked: "XXXX-1002",
        accountType: "AUTO_LOAN",
        openedDate: "2022-08",
        status: "CURRENT",
        balance: 1480000,
        creditLimit: null,
        monthlyPayment: 41200,
        pastDueAmount: 0,
        paymentHistory24Mo: h(""),
        remarks: null,
        reportedBy: [...TRI],
      },
      {
        creditor: "Example Mortgage Corp",
        accountNumberMasked: "XXXX-1003",
        accountType: "MORTGAGE",
        openedDate: "2019-06",
        status: "CURRENT",
        balance: 21500000,
        creditLimit: null,
        monthlyPayment: 168000,
        pastDueAmount: 0,
        paymentHistory24Mo: h(""),
        remarks: null,
        reportedBy: [...TRI],
      },
    ],
    collections: [],
    publicRecords: [],
    inquiries: [{ creditor: "Fixture Auto Finance", date: "2022-08", inquiryType: "HARD" }],
  }),

  buildReport({
    reportId: "SAMPLE-0002",
    generatedFor: "late-payments (scattered 30/60/90-day lates, no collections)",
    name: "Casey Fixture",
    dateOfBirth: "1992-11-03",
    ssnLast4: "0002",
    addresses: ["456 Placeholder Avenue, Apt 2B, Springfield, US 00002"],
    employers: ["Sample Logistics LLC"],
    scores: { equifax: 641, experian: 652, transunion: 636 },
    tradelines: [
      {
        creditor: "Sample National Bank",
        accountNumberMasked: "XXXX-2001",
        accountType: "CREDIT_CARD",
        openedDate: "2019-01",
        status: "LATE_30",
        balance: 312000,
        creditLimit: 500000,
        monthlyPayment: 9500,
        pastDueAmount: 9500,
        paymentHistory24Mo: h("1CC1CCC2"),
        remarks: "30 days past due as of last reporting",
        reportedBy: [...TRI],
      },
      {
        creditor: "Fixture Auto Finance",
        accountNumberMasked: "XXXX-2002",
        accountType: "AUTO_LOAN",
        openedDate: "2021-05",
        status: "LATE_90",
        balance: 987000,
        creditLimit: null,
        monthlyPayment: 36800,
        pastDueAmount: 110400,
        paymentHistory24Mo: h("321CCCC1"),
        remarks: "90 days past due",
        reportedBy: [...TRI],
      },
      {
        creditor: "Example Retail Card Services",
        accountNumberMasked: "XXXX-2003",
        accountType: "RETAIL_CARD",
        openedDate: "2020-11",
        status: "CURRENT",
        balance: 68000,
        creditLimit: 150000,
        monthlyPayment: 3000,
        pastDueAmount: 0,
        paymentHistory24Mo: h("CCCC21"),
        remarks: "Previously 60 days late, now current",
        reportedBy: ["EQUIFAX", "TRANSUNION"],
      },
      {
        creditor: "Placeholder Student Lending",
        accountNumberMasked: "XXXX-2004",
        accountType: "STUDENT_LOAN",
        openedDate: "2014-09",
        status: "CURRENT",
        balance: 2240000,
        creditLimit: null,
        monthlyPayment: 24500,
        pastDueAmount: 0,
        paymentHistory24Mo: h(""),
        remarks: null,
        reportedBy: [...TRI],
      },
    ],
    collections: [],
    publicRecords: [],
    inquiries: [
      { creditor: "Sample National Bank", date: "2025-09", inquiryType: "HARD" },
      { creditor: "Example Retail Card Services", date: "2025-04", inquiryType: "HARD" },
    ],
  }),

  buildReport({
    reportId: "SAMPLE-0003",
    generatedFor: "collections-chargeoff (medical + telecom collections, charged-off card)",
    name: "Morgan Testcase",
    dateOfBirth: "1985-07-22",
    ssnLast4: "0003",
    addresses: ["789 Mockingbird Lane, Springfield, US 00003", "12 Prior Address Road, Springfield, US 00004"],
    employers: ["Fixture Manufacturing Inc."],
    scores: { equifax: 568, experian: 574, transunion: 561 },
    tradelines: [
      {
        creditor: "Sample National Bank",
        accountNumberMasked: "XXXX-3001",
        accountType: "CREDIT_CARD",
        openedDate: "2018-02",
        status: "CHARGE_OFF",
        balance: 486200,
        creditLimit: 450000,
        monthlyPayment: null,
        pastDueAmount: 486200,
        paymentHistory24Mo: h("5555554321"),
        remarks: "Charged off. Account closed by credit grantor.",
        reportedBy: [...TRI],
      },
      {
        creditor: "Example Credit Union",
        accountNumberMasked: "XXXX-3002",
        accountType: "PERSONAL_LOAN",
        openedDate: "2022-03",
        status: "LATE_60",
        balance: 542000,
        creditLimit: null,
        monthlyPayment: 21400,
        pastDueAmount: 42800,
        paymentHistory24Mo: h("21C1"),
        remarks: null,
        reportedBy: [...TRI],
      },
      {
        creditor: "Fixture Auto Finance",
        accountNumberMasked: "XXXX-3003",
        accountType: "AUTO_LOAN",
        openedDate: "2023-01",
        status: "CURRENT",
        balance: 1620000,
        creditLimit: null,
        monthlyPayment: 44900,
        pastDueAmount: 0,
        paymentHistory24Mo: h(""),
        remarks: null,
        reportedBy: [...TRI],
      },
    ],
    collections: [
      {
        agency: "Sample Recovery Group",
        originalCreditor: "Springfield General Hospital (fictitious)",
        accountNumberMasked: "XXXX-3101",
        collectionType: "MEDICAL",
        placedDate: "2024-06",
        originalAmount: 128700,
        currentBalance: 128700,
        status: "UNPAID",
      },
      {
        agency: "Placeholder Collections LLC",
        originalCreditor: "Example Telecom",
        accountNumberMasked: "XXXX-3102",
        collectionType: "TELECOM",
        placedDate: "2023-11",
        originalAmount: 41300,
        currentBalance: 41300,
        status: "DISPUTED",
      },
      {
        agency: "Sample Recovery Group",
        originalCreditor: "Example Power & Light",
        accountNumberMasked: "XXXX-3103",
        collectionType: "UTILITY",
        placedDate: "2022-04",
        originalAmount: 28800,
        currentBalance: 0,
        status: "PAID",
      },
    ],
    publicRecords: [],
    inquiries: [
      { creditor: "Fixture Auto Finance", date: "2023-01", inquiryType: "HARD" },
      { creditor: "Example Credit Union", date: "2022-03", inquiryType: "HARD" },
      { creditor: "Sample Insurance Co.", date: "2025-10", inquiryType: "SOFT" },
    ],
  }),

  buildReport({
    reportId: "SAMPLE-0004",
    generatedFor: "bankruptcy-ch7 (discharged Chapter 7 with included accounts)",
    name: "Riley Specimen",
    dateOfBirth: "1979-01-30",
    ssnLast4: "0004",
    addresses: ["321 Nullpointer Court, Springfield, US 00005"],
    employers: ["Sample Municipal Services"],
    scores: { equifax: 542, experian: 549, transunion: 538 },
    tradelines: [
      {
        creditor: "Sample National Bank",
        accountNumberMasked: "XXXX-4001",
        accountType: "CREDIT_CARD",
        openedDate: "2015-06",
        status: "INCLUDED_IN_BANKRUPTCY",
        balance: 0,
        creditLimit: 800000,
        monthlyPayment: null,
        pastDueAmount: 0,
        paymentHistory24Mo: h("------------555554"),
        remarks: "Discharged through Chapter 7 bankruptcy",
        reportedBy: [...TRI],
      },
      {
        creditor: "Example Retail Card Services",
        accountNumberMasked: "XXXX-4002",
        accountType: "RETAIL_CARD",
        openedDate: "2017-12",
        status: "INCLUDED_IN_BANKRUPTCY",
        balance: 0,
        creditLimit: 200000,
        monthlyPayment: null,
        pastDueAmount: 0,
        paymentHistory24Mo: h("------------55554"),
        remarks: "Discharged through Chapter 7 bankruptcy",
        reportedBy: ["EQUIFAX", "EXPERIAN"],
      },
      {
        creditor: "Fixture Secured Card Bank",
        accountNumberMasked: "XXXX-4003",
        accountType: "CREDIT_CARD",
        openedDate: "2025-02",
        status: "CURRENT",
        balance: 18000,
        creditLimit: 30000,
        monthlyPayment: 2500,
        pastDueAmount: 0,
        paymentHistory24Mo: h(""),
        remarks: "Secured card opened post-discharge",
        reportedBy: [...TRI],
      },
    ],
    collections: [],
    publicRecords: [
      {
        recordType: "BANKRUPTCY_CH7",
        filedDate: "2024-03",
        status: "DISCHARGED",
        court: "US Bankruptcy Court, District of Springfield (fictitious)",
        referenceNumber: "24-BK-00042",
        amount: null,
        resolvedDate: "2024-07",
      },
    ],
    inquiries: [{ creditor: "Fixture Secured Card Bank", date: "2025-02", inquiryType: "HARD" }],
  }),

  buildReport({
    reportId: "SAMPLE-0005",
    generatedFor: "repo-judgment (auto repossession with deficiency, civil judgment, tax lien)",
    name: "Avery Mockdata",
    dateOfBirth: "1990-09-15",
    ssnLast4: "0005",
    addresses: ["654 Stub Street, Springfield, US 00006"],
    employers: ["Placeholder Construction Co."],
    scores: { equifax: 521, experian: 530, transunion: 516 },
    tradelines: [
      {
        creditor: "Fixture Auto Finance",
        accountNumberMasked: "XXXX-5001",
        accountType: "AUTO_LOAN",
        openedDate: "2022-04",
        status: "REPOSSESSION",
        balance: 612400,
        creditLimit: null,
        monthlyPayment: null,
        pastDueAmount: 612400,
        paymentHistory24Mo: h("--5555543321"),
        remarks: "Vehicle repossessed 2025-03. Deficiency balance after auction.",
        reportedBy: [...TRI],
      },
      {
        creditor: "Sample National Bank",
        accountNumberMasked: "XXXX-5002",
        accountType: "CREDIT_CARD",
        openedDate: "2019-08",
        status: "LATE_120",
        balance: 297500,
        creditLimit: 300000,
        monthlyPayment: 8900,
        pastDueAmount: 35600,
        paymentHistory24Mo: h("4321C1"),
        remarks: null,
        reportedBy: [...TRI],
      },
      {
        creditor: "Example Credit Union",
        accountNumberMasked: "XXXX-5003",
        accountType: "LINE_OF_CREDIT",
        openedDate: "2020-10",
        status: "CURRENT",
        balance: 145000,
        creditLimit: 500000,
        monthlyPayment: 5000,
        pastDueAmount: 0,
        paymentHistory24Mo: h("CC1"),
        remarks: null,
        reportedBy: ["EXPERIAN", "TRANSUNION"],
      },
    ],
    collections: [
      {
        agency: "Placeholder Collections LLC",
        originalCreditor: "Fixture Auto Finance",
        accountNumberMasked: "XXXX-5101",
        collectionType: "AUTO_DEFICIENCY",
        placedDate: "2025-07",
        originalAmount: 612400,
        currentBalance: 612400,
        status: "UNPAID",
      },
    ],
    publicRecords: [
      {
        recordType: "CIVIL_JUDGMENT",
        filedDate: "2024-10",
        status: "UNSATISFIED",
        court: "Springfield County Civil Court (fictitious)",
        referenceNumber: "CV-2024-1187",
        amount: 234500,
        resolvedDate: null,
      },
      {
        recordType: "TAX_LIEN",
        filedDate: "2023-05",
        status: "RELEASED",
        court: "Springfield County Recorder (fictitious)",
        referenceNumber: "TL-2023-0331",
        amount: 187200,
        resolvedDate: "2025-01",
      },
    ],
    inquiries: [
      { creditor: "Example Subprime Lending", date: "2025-11", inquiryType: "HARD" },
      { creditor: "Sample Rent-to-Own", date: "2025-08", inquiryType: "HARD" },
      { creditor: "Fixture Payday Advance", date: "2025-06", inquiryType: "HARD" },
    ],
  }),

  buildReport({
    reportId: "SAMPLE-0006",
    generatedFor:
      "kitchen-sink (Chapter 13, foreclosure, charge-offs, collections, maxed utilization, heavy inquiries)",
    name: "Quinn Allmarks",
    dateOfBirth: "1983-02-08",
    ssnLast4: "0006",
    addresses: ["987 Worstcase Way, Springfield, US 00007"],
    employers: ["Example Hospitality Group", "Prior: Sample Staffing Agency"],
    scores: { equifax: 487, experian: 495, transunion: 481 },
    tradelines: [
      {
        creditor: "Example Mortgage Corp",
        accountNumberMasked: "XXXX-6001",
        accountType: "MORTGAGE",
        openedDate: "2016-05",
        status: "FORECLOSURE",
        balance: 0,
        creditLimit: null,
        monthlyPayment: null,
        pastDueAmount: 0,
        paymentHistory24Mo: h("--------555555443221"),
        remarks: "Foreclosure completed 2025-01",
        reportedBy: [...TRI],
      },
      {
        creditor: "Sample National Bank",
        accountNumberMasked: "XXXX-6002",
        accountType: "CREDIT_CARD",
        openedDate: "2017-09",
        status: "CHARGE_OFF",
        balance: 723800,
        creditLimit: 700000,
        monthlyPayment: null,
        pastDueAmount: 723800,
        paymentHistory24Mo: h("555555554321"),
        remarks: "Charged off as bad debt",
        reportedBy: [...TRI],
      },
      {
        creditor: "Example Retail Card Services",
        accountNumberMasked: "XXXX-6003",
        accountType: "RETAIL_CARD",
        openedDate: "2021-03",
        status: "LATE_90",
        balance: 148700,
        creditLimit: 150000,
        monthlyPayment: 4500,
        pastDueAmount: 13500,
        paymentHistory24Mo: h("3211C21"),
        remarks: null,
        reportedBy: [...TRI],
      },
      {
        creditor: "Placeholder Student Lending",
        accountNumberMasked: "XXXX-6004",
        accountType: "STUDENT_LOAN",
        openedDate: "2010-09",
        status: "LATE_120",
        balance: 4180000,
        creditLimit: null,
        monthlyPayment: 38200,
        pastDueAmount: 152800,
        paymentHistory24Mo: h("443321"),
        remarks: "Deferment ended; account seriously delinquent",
        reportedBy: [...TRI],
      },
      {
        creditor: "Fixture Subprime Card Bank",
        accountNumberMasked: "XXXX-6005",
        accountType: "CREDIT_CARD",
        openedDate: "2024-08",
        status: "LATE_30",
        balance: 98600,
        creditLimit: 100000,
        monthlyPayment: 4000,
        pastDueAmount: 4000,
        paymentHistory24Mo: h("1C1C"),
        remarks: null,
        reportedBy: ["EQUIFAX", "TRANSUNION"],
      },
    ],
    collections: [
      {
        agency: "Sample Recovery Group",
        originalCreditor: "Springfield General Hospital (fictitious)",
        accountNumberMasked: "XXXX-6101",
        collectionType: "MEDICAL",
        placedDate: "2025-02",
        originalAmount: 342100,
        currentBalance: 342100,
        status: "UNPAID",
      },
      {
        agency: "Placeholder Collections LLC",
        originalCreditor: "Example Apartments LP",
        accountNumberMasked: "XXXX-6102",
        collectionType: "RENTAL",
        placedDate: "2024-09",
        originalAmount: 289400,
        currentBalance: 289400,
        status: "UNPAID",
      },
      {
        agency: "Fixture Debt Buyers Inc.",
        originalCreditor: "Example Telecom",
        accountNumberMasked: "XXXX-6103",
        collectionType: "TELECOM",
        placedDate: "2023-12",
        originalAmount: 66200,
        currentBalance: 33100,
        status: "SETTLED",
      },
    ],
    publicRecords: [
      {
        recordType: "BANKRUPTCY_CH13",
        filedDate: "2025-06",
        status: "FILED",
        court: "US Bankruptcy Court, District of Springfield (fictitious)",
        referenceNumber: "25-BK-00913",
        amount: null,
        resolvedDate: null,
      },
      {
        recordType: "CIVIL_JUDGMENT",
        filedDate: "2024-02",
        status: "SATISFIED",
        court: "Springfield County Civil Court (fictitious)",
        referenceNumber: "CV-2024-0288",
        amount: 91800,
        resolvedDate: "2025-04",
      },
    ],
    inquiries: [
      { creditor: "Fixture Payday Advance", date: "2026-01", inquiryType: "HARD" },
      { creditor: "Example Subprime Lending", date: "2025-12", inquiryType: "HARD" },
      { creditor: "Sample Rent-to-Own", date: "2025-10", inquiryType: "HARD" },
      { creditor: "Fixture Subprime Card Bank", date: "2024-08", inquiryType: "HARD" },
      { creditor: "Placeholder Furniture Credit", date: "2025-05", inquiryType: "HARD" },
    ],
  }),
];

function main() {
  const outDir = join(__dirname, "..", "fixtures", "credit-reports");
  mkdirSync(outDir, { recursive: true });

  for (const report of personas) {
    const slug = report.generatedFor.split(" ")[0];
    writeFileSync(join(outDir, `${slug}.json`), JSON.stringify(report, null, 2) + "\n");
    writeFileSync(join(outDir, `${slug}.txt`), renderCreditReport(report) + "\n");
    console.log(`wrote ${slug}.json + ${slug}.txt`);
  }
}

if (require.main === module) main();
