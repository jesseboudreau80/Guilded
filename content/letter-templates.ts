import { Tier } from "@prisma/client";
import { LEGAL_EDUCATION_NOTE } from "./curriculum";

/**
 * Plutus letter template library. Placeholders use [BRACKETED CAPS] and must
 * be replaced by the user before sending. Template bodies must never promise
 * outcomes (deletion, score changes) — tests/letter-templates.test.ts
 * enforces a forbidden-phrase list, the same rule the future Horkos review
 * engine will apply to generated letters.
 */

export type LetterTemplate = {
  slug: string;
  title: string;
  category: "Bureau" | "Furnisher" | "Collector" | "Escalation";
  requiredTier: Tier;
  whenToUse: string;
  body: string;
  tips: string[];
};

export const letterTemplates: LetterTemplate[] = [
  {
    slug: "bureau-dispute",
    title: "Credit Bureau Dispute (FCRA §611)",
    category: "Bureau",
    requiredTier: "JOURNEYMAN",
    whenToUse:
      "An item on a bureau's report is inaccurate: wrong status, wrong balance, not yours, duplicated, or older than its FCRA reporting limit. Send to the bureau reporting the error — one letter per bureau.",
    body: `[DATE]

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]
Date of birth: [DOB]
SSN (last four): XXX-XX-[LAST 4]

[BUREAU NAME]
[BUREAU DISPUTE ADDRESS]

Re: Dispute of inaccurate information — request for reinvestigation

To whom it may concern:

I am disputing the following item on my [BUREAU NAME] credit report under section 611 of the Fair Credit Reporting Act:

Creditor: [CREDITOR NAME AS SHOWN ON REPORT]
Account number (as shown): [PARTIAL ACCOUNT NUMBER]

This item is inaccurate because: [STATE SPECIFICALLY WHAT IS WRONG — e.g., "the account is reported 30 days late for March 2026, but the enclosed bank statement shows the payment posted on March 3, 2026"].

The correct information is: [STATE THE CORRECT STATUS/BALANCE/DATES].

I have enclosed copies of documents supporting this dispute: [LIST ENCLOSURES]. Please reinvestigate this item and correct or delete it as required, and send me the results of your reinvestigation and a corrected copy of my report.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]

Enclosures: [LIST — copy of report page with item circled, supporting documents]`,
    tips: [
      "Send certified mail with return receipt — the delivery date starts the 30-day reinvestigation clock.",
      "One item (or a small set of related items) per letter. Enclose copies, never originals.",
      "Dispute the same item at every bureau reporting it; each bureau requires its own letter.",
      "Keep the tone factual. Specific facts plus evidence beat legal-sounding boilerplate.",
    ],
  },
  {
    slug: "furnisher-dispute",
    title: "Furnisher Direct Dispute (FCRA §623)",
    category: "Furnisher",
    requiredTier: "JOURNEYMAN",
    whenToUse:
      "A bureau 'verified' an item you can prove is wrong. This letter goes to the company reporting the data (the furnisher) and triggers its own duty to investigate.",
    body: `[DATE]

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]

[FURNISHER NAME]
[FURNISHER ADDRESS — use the credit-dispute address from their website or your statement]

Re: Direct dispute of information furnished to credit bureaus
Account number: [PARTIAL ACCOUNT NUMBER]

To whom it may concern:

Under section 623(a)(8) of the Fair Credit Reporting Act and 12 C.F.R. § 1022.43, I am disputing information your company furnishes to the credit bureaus about the account above.

The information is inaccurate because: [STATE SPECIFICALLY WHAT IS WRONG].

The correct information is: [STATE THE CORRECT STATUS/BALANCE/DATES].

I previously disputed this item with [BUREAU NAME(S)] on [DATE(S)], and it was reported as verified. Enclosed are copies of the documents that support my dispute: [LIST ENCLOSURES].

Please investigate, correct the information you furnish to all bureaus that received it, and confirm the outcome to me in writing.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]

Enclosures: [LIST]`,
    tips: [
      "Use this after a bureau dispute comes back 'verified' — it opens a second front with the source of the data.",
      "Reference your earlier bureau dispute by date; enclose the bureau's results letter.",
      "Certified mail, return receipt, copies only — same discipline as every dispute.",
    ],
  },
  {
    slug: "debt-validation",
    title: "Debt Validation Request (FDCPA §1692g)",
    category: "Collector",
    requiredTier: "JOURNEYMAN",
    whenToUse:
      "A collection agency has contacted you for the first time. Send within 30 days of receiving their validation notice — collection must pause until they respond.",
    body: `[DATE]

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]

[COLLECTION AGENCY NAME]
[AGENCY ADDRESS]

Re: Account/reference number: [REFERENCE NUMBER FROM THEIR NOTICE]

To whom it may concern:

I received your communication dated [DATE OF THEIR NOTICE] regarding the account above. Within the 30-day period provided by section 809(b) of the Fair Debt Collection Practices Act, I dispute this debt and request validation.

Please provide:
1. An itemization of the amount claimed, including principal, interest, fees, and payments applied;
2. The name and address of the original creditor and the original account number;
3. Documentation showing your authority to collect this debt;
4. The date of the last payment on the account.

Please note that under section 809(b), collection activity must cease until you have provided verification. Please direct all future communication about this account to me in writing at the address above.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]`,
    tips: [
      "The 30-day window runs from receipt of their first notice — calendar it the day the notice arrives and do not spend it on the phone.",
      "Do not acknowledge the debt as yours, agree to pay, or make any payment before validation and a statute-of-limitations check — partial payment can restart the clock in many states.",
      "If validation never arrives and collection continues, you have both an FCRA dispute and a potential FDCPA claim — log everything.",
    ],
  },
  {
    slug: "goodwill-request",
    title: "Goodwill Adjustment Request",
    category: "Furnisher",
    requiredTier: "JOURNEYMAN",
    whenToUse:
      "An accurate late payment on an account with an otherwise good history. This is a courtesy request, not a legal demand — it works on relationship, not leverage.",
    body: `[DATE]

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]

[CREDITOR NAME]
[CREDITOR ADDRESS]

Re: Account number: [PARTIAL ACCOUNT NUMBER] — goodwill request

Dear [CREDITOR NAME] customer service:

I have been a customer since [YEAR], and I value the relationship. I am writing about the late payment reported for [MONTH/YEAR].

The payment was late because [BRIEF, HONEST REASON — e.g., "a hospitalization disrupted my finances that month"]. Since then, I have made [NUMBER] consecutive on-time payments, and the account is current.

I am asking, as a courtesy, whether you would consider a goodwill adjustment removing the late-payment notation from my credit reports. I understand the notation is accurate and that this is entirely at your discretion. Either way, thank you for considering it and for your service over the years.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]
[PHONE NUMBER]`,
    tips: [
      "Honesty and brevity win here — this letter has no legal force, so tone is the whole game.",
      "Best odds: long relationship, isolated slip, account now current. Weak odds: repeated lates or an account still behind.",
      "A polite 'no' costs nothing; some people succeed on the second or third try months apart.",
    ],
  },
  {
    slug: "identity-theft-block",
    title: "Identity Theft Block (FCRA §605B)",
    category: "Bureau",
    requiredTier: "JOURNEYMAN",
    whenToUse:
      "Items on your report resulted from identity theft. Requires an FTC Identity Theft Report from IdentityTheft.gov. Faster and stronger than an ordinary dispute for fraud items.",
    body: `[DATE]

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]
Date of birth: [DOB]
SSN (last four): XXX-XX-[LAST 4]

[BUREAU NAME]
[BUREAU FRAUD/DISPUTE ADDRESS]

Re: Request to block information resulting from identity theft (FCRA section 605B)

To whom it may concern:

I am a victim of identity theft. Under section 605B of the Fair Credit Reporting Act, I request that you block the following information, which resulted from identity theft and does not relate to any transaction I made or authorized:

1. [CREDITOR / ACCOUNT NUMBER AS SHOWN]
2. [ADDITIONAL ITEMS AS NEEDED]

Enclosed please find: (1) a copy of my FTC Identity Theft Report; (2) proof of my identity ([LIST — e.g., copy of driver's license and a utility bill showing my current address]); and (3) a copy of my credit report with the fraudulent items circled.

Section 605B requires these items to be blocked within four business days of receipt. Please confirm the block in writing and send an updated copy of my report.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]

Enclosures: FTC Identity Theft Report; identification; marked report copy`,
    tips: [
      "File the FTC report first at IdentityTheft.gov — this letter does not work without it.",
      "Consider a police report as well; some furnishers and bureaus give it additional weight.",
      "Place a fraud alert or security freeze at all three bureaus at the same time.",
    ],
  },
  {
    slug: "cease-communication",
    title: "Cease Communication Letter (FDCPA §1692c(c))",
    category: "Collector",
    requiredTier: "JOURNEYMAN",
    whenToUse:
      "A collector's contact has become harassing, or you have decided the account will be resolved another way (or not at all). After receipt, they may contact you only to confirm they are stopping or to give notice of specific actions such as a lawsuit.",
    body: `[DATE]

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]

[COLLECTION AGENCY NAME]
[AGENCY ADDRESS]

Re: Account/reference number: [REFERENCE NUMBER]

To whom it may concern:

Under section 805(c) of the Fair Debt Collection Practices Act, I am directing you to cease all communication with me regarding the account referenced above, through any medium, including telephone, text, email, and social media.

As provided by the statute, you may contact me only to confirm that further collection efforts are being terminated or to notify me that you or the creditor intend to invoke a specified remedy.

This letter is not an acknowledgment that I owe this debt.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]`,
    tips: [
      "Understand the trade-off before sending: silence is comfortable, but a collector with legal options may respond by suing rather than negotiating. Check the statute of limitations first.",
      "This applies to third-party collectors under the FDCPA — original creditors are covered in some states but not by the federal statute.",
      "Keep the certified-mail receipt; contact after receipt (beyond the two allowed purposes) is a violation worth logging.",
    ],
  },
  {
    slug: "settlement-offer",
    title: "Settlement Offer with Reporting Terms",
    category: "Collector",
    requiredTier: "MASTER",
    whenToUse:
      "A validated, within-statute collection you have decided to resolve. The letter negotiates the amount AND the credit reporting in the same agreement — never pay without the reporting terms in writing.",
    body: `[DATE]

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]

[COLLECTION AGENCY NAME]
[AGENCY ADDRESS]

Re: Account/reference number: [REFERENCE NUMBER]

To whom it may concern:

This letter is an offer to resolve the account referenced above. It is not an acknowledgment of liability, and it is made for settlement purposes only.

I am prepared to pay [AMOUNT — e.g., "$X, approximately Y% of the claimed balance"] as full and final satisfaction of this account, on the following terms:

1. You will accept the payment as settlement in full, with no further amount owed by me on this account;
2. Upon payment, you will request deletion of the tradeline for this account from all consumer reporting agencies to which it was furnished, or, at minimum, report the account as settled with a zero balance;
3. You will not sell, transfer, or assign any remaining claimed balance;
4. You will confirm these terms in writing, on your letterhead, before any payment is made.

If these terms are acceptable, please send written confirmation to the address above. Upon receiving it, I will remit payment by [METHOD — e.g., cashier's check] within [NUMBER] days.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]`,
    tips: [
      "Nothing is real until their written confirmation arrives — no payment on a phone promise, ever.",
      "Pay traceably (cashier's check or money order). Never give a collector direct access to your bank account.",
      "Verify the reporting change on all three bureaus about 45 days after payment; your written agreement is the dispute evidence if it does not happen.",
      "Forgiven debt over $600 can generate a 1099-C and taxable income — factor it into the offer math.",
    ],
  },
  {
    slug: "pre-arbitration-notice",
    title: "Pre-Arbitration Notice of Dispute",
    category: "Escalation",
    requiredTier: "MASTER",
    whenToUse:
      "You have a documented legal claim (FCRA/FDCPA) that disputes and CFPB complaints did not resolve, and the company's arbitration clause requires written notice and an informal-resolution period before filing. This is the opening move of the arbitration playbook — and it settles a meaningful share of cases by itself.",
    body: `[DATE]

VIA CERTIFIED MAIL — RETURN RECEIPT REQUESTED

[YOUR FULL NAME]
[YOUR ADDRESS]
[CITY, STATE ZIP]

[COMPANY LEGAL/NOTICE ADDRESS — use the address specified in the arbitration clause]

Re: Notice of dispute pursuant to the arbitration provision of [AGREEMENT NAME/DATE]
Account: [PARTIAL ACCOUNT NUMBER]

To whom it may concern:

This letter is the written notice of dispute required by the dispute-resolution provision of the agreement referenced above.

Description of the dispute: [CONCISE FACTS IN DATE ORDER — e.g., "On DATE I disputed X with your company and with the credit bureaus (copies enclosed). The item was verified without correction despite the enclosed evidence showing Y."]

Legal basis: I believe this conduct violates [STATUTE(S) — e.g., "sections 611 and 623 of the Fair Credit Reporting Act"].

Relief requested: [WHAT RESOLVES IT — e.g., "correction of the reporting to all bureaus, written confirmation, and statutory damages as provided by law"].

I am willing to resolve this informally during the period provided by the agreement. If it is not resolved within [NUMBER, PER THE CLAUSE — commonly 30] days, I intend to file a demand for arbitration with [AAA / JAMS, PER THE CLAUSE] under its consumer rules.

Sincerely,

[SIGNATURE]
[YOUR FULL NAME]
[PHONE AND EMAIL]

Enclosures: [DISPUTE LOG, PRIOR LETTERS AND RESPONSES, REPORT EXCERPTS]`,
    tips: [
      "Read your clause first — send this to the exact notice address it specifies, or the notice may not count.",
      "Attach the paper trail: dispute log, certified receipts, prior responses. The enclosures do the persuading.",
      "State only claims you can support; the arbitration module covers what happens if the company lets the window lapse.",
      "For claims with real money at stake, an hour of a consumer attorney's review before filing is the best purchase in the process — many take FCRA/FDCPA cases on contingency.",
    ],
  },
];

export const TEMPLATE_LIBRARY_NOTE = LEGAL_EDUCATION_NOTE;
