import { z } from "zod";

/**
 * Synthetic credit report schema used for testing Plutus's educational
 * tooling (dispute-letter templates, report-reading lessons, AI assistant
 * prompts). Every report produced with this schema is fictitious:
 * `synthetic` must be true, SSNs must use the never-issued 999 area
 * prefix, and the disclaimer must be present verbatim.
 */

export const SYNTHETIC_DISCLAIMER =
  "FICTITIOUS SAMPLE DATA — This report was generated for software testing and education. " +
  "It does not describe a real person, account, or event.";

export const bureauSchema = z.enum(["EQUIFAX", "EXPERIAN", "TRANSUNION"]);

export const accountTypeSchema = z.enum([
  "CREDIT_CARD",
  "AUTO_LOAN",
  "MORTGAGE",
  "STUDENT_LOAN",
  "PERSONAL_LOAN",
  "RETAIL_CARD",
  "LINE_OF_CREDIT",
]);

export const tradelineStatusSchema = z.enum([
  "CURRENT",
  "PAID_CLOSED",
  "LATE_30",
  "LATE_60",
  "LATE_90",
  "LATE_120",
  "CHARGE_OFF",
  "COLLECTION",
  "REPOSSESSION",
  "FORECLOSURE",
  "INCLUDED_IN_BANKRUPTCY",
]);

export const DEROGATORY_STATUSES: ReadonlySet<TradelineStatus> = new Set([
  "LATE_30",
  "LATE_60",
  "LATE_90",
  "LATE_120",
  "CHARGE_OFF",
  "COLLECTION",
  "REPOSSESSION",
  "FORECLOSURE",
  "INCLUDED_IN_BANKRUPTCY",
]);

/**
 * 24 months of payment history, most recent month first.
 * C = paid as agreed, 1 = 30 days late, 2 = 60, 3 = 90, 4 = 120,
 * 5 = 150+/charge-off, - = no data reported.
 */
export const paymentHistorySchema = z
  .string()
  .length(24)
  .regex(/^[C12345-]+$/);

export const tradelineSchema = z.object({
  creditor: z.string().min(1),
  accountNumberMasked: z.string().regex(/^XXXX-?\d{4}$/),
  accountType: accountTypeSchema,
  openedDate: z.string().regex(/^\d{4}-\d{2}$/),
  status: tradelineStatusSchema,
  balance: z.number().int().min(0),
  creditLimit: z.number().int().min(0).nullable(),
  monthlyPayment: z.number().int().min(0).nullable(),
  pastDueAmount: z.number().int().min(0),
  paymentHistory24Mo: paymentHistorySchema,
  remarks: z.string().nullable(),
  reportedBy: z.array(bureauSchema).min(1),
});

export const collectionSchema = z.object({
  agency: z.string().min(1),
  originalCreditor: z.string().min(1),
  accountNumberMasked: z.string().regex(/^XXXX-?\d{4}$/),
  collectionType: z.enum(["MEDICAL", "UTILITY", "TELECOM", "CREDIT_CARD", "AUTO_DEFICIENCY", "RENTAL"]),
  placedDate: z.string().regex(/^\d{4}-\d{2}$/),
  originalAmount: z.number().int().min(0),
  currentBalance: z.number().int().min(0),
  status: z.enum(["UNPAID", "PAID", "SETTLED", "DISPUTED"]),
});

export const publicRecordSchema = z.object({
  recordType: z.enum(["BANKRUPTCY_CH7", "BANKRUPTCY_CH13", "CIVIL_JUDGMENT", "TAX_LIEN"]),
  filedDate: z.string().regex(/^\d{4}-\d{2}$/),
  status: z.enum(["FILED", "DISCHARGED", "DISMISSED", "SATISFIED", "UNSATISFIED", "RELEASED"]),
  court: z.string().min(1),
  referenceNumber: z.string().min(1),
  amount: z.number().int().min(0).nullable(),
  resolvedDate: z.string().regex(/^\d{4}-\d{2}$/).nullable(),
});

export const inquirySchema = z.object({
  creditor: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}$/),
  inquiryType: z.enum(["HARD", "SOFT"]),
});

export const creditReportSchema = z.object({
  reportId: z.string().min(1),
  synthetic: z.literal(true),
  disclaimer: z.literal(SYNTHETIC_DISCLAIMER),
  generatedFor: z.string().min(1),
  consumer: z.object({
    name: z.string().min(1),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // 999 is an SSN area number that is never issued to real people.
    ssnMasked: z.string().regex(/^999-XX-\d{4}$/),
    addresses: z.array(z.string().min(1)).min(1),
    employers: z.array(z.string()),
  }),
  scores: z.object({
    equifax: z.number().int().min(300).max(850),
    experian: z.number().int().min(300).max(850),
    transunion: z.number().int().min(300).max(850),
  }),
  summary: z.object({
    totalAccounts: z.number().int().min(0),
    openAccounts: z.number().int().min(0),
    derogatoryAccounts: z.number().int().min(0),
    collectionsCount: z.number().int().min(0),
    publicRecordCount: z.number().int().min(0),
    hardInquiries: z.number().int().min(0),
    totalBalance: z.number().int().min(0),
    revolvingUtilizationPct: z.number().min(0).max(999),
  }),
  tradelines: z.array(tradelineSchema),
  collections: z.array(collectionSchema),
  publicRecords: z.array(publicRecordSchema),
  inquiries: z.array(inquirySchema),
});

export type Bureau = z.infer<typeof bureauSchema>;
export type AccountType = z.infer<typeof accountTypeSchema>;
export type TradelineStatus = z.infer<typeof tradelineStatusSchema>;
export type Tradeline = z.infer<typeof tradelineSchema>;
export type Collection = z.infer<typeof collectionSchema>;
export type PublicRecord = z.infer<typeof publicRecordSchema>;
export type Inquiry = z.infer<typeof inquirySchema>;
export type CreditReport = z.infer<typeof creditReportSchema>;
