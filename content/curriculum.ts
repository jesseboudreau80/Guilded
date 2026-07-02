import { Tier } from "@prisma/client";

/**
 * Plutus curriculum. Seeded into the LMS by prisma/seed.ts and validated by
 * tests/curriculum.test.ts. Everything here is education, not legal or
 * financial advice — lessons that touch legal process must carry
 * LEGAL_EDUCATION_NOTE verbatim (the test suite enforces this).
 */

export const LEGAL_EDUCATION_NOTE =
  "This lesson is educational information, not legal advice. Laws, fees, and deadlines change and vary by state. Before acting on anything here, verify current rules and consider a consultation with a licensed attorney in your state.";

export type CurriculumLesson = {
  slug: string;
  title: string;
  content: string;
};

export type CurriculumModule = {
  slug: string;
  title: string;
  requiredTier: Tier;
  order: number;
  description: string;
  lessons: CurriculumLesson[];
};

export const curriculum: CurriculumModule[] = [
  {
    slug: "foundations",
    title: "Credit Literacy Foundations",
    requiredTier: "APPRENTICE",
    order: 1,
    description: "How scores work, how to read a report, and the rights every consumer has.",
    lessons: [
      {
        slug: "how-scores-work",
        title: "How Credit Scores Actually Work",
        content: `A credit score is a prediction, not a grade. Lenders buy scores because a three-digit number is a fast way to estimate one thing: how likely you are to fall 90 or more days behind on a payment in the next 24 months. Once you see the score as a risk prediction, most of its behavior stops being mysterious.

The two scoring families you will encounter are FICO and VantageScore. Both run from 300 to 850, both are calculated separately from the data at each of the three bureaus (Equifax, Experian, and TransUnion), and both come in many versions. This is why your "score" is never one number — a mortgage lender may pull a different FICO version than your credit card app shows you. Do not chase a single number; work on the underlying data.

The classic FICO weightings are worth memorizing as a mental model: payment history about 35%, amounts owed (mostly revolving utilization) about 30%, length of credit history about 15%, new credit about 10%, and credit mix about 10%. The two on the left are two-thirds of the model. A perfect credit mix cannot outweigh a single fresh 90-day late.

Two consequences follow. First, the most powerful "repair" action available to anyone is boring: make every payment on time from today forward and let negative items age. Recent activity is weighted far more heavily than old activity. Second, utilization has no memory in most scoring versions — paying a maxed-out card down before the statement closes can move a score within one reporting cycle, which makes it the fastest legitimate lever you have.

Later modules cover what to do when the data itself is wrong. This module makes sure you can read that data first.`,
      },
      {
        slug: "reading-your-report",
        title: "Reading Your Credit Report, Section by Section",
        content: `Every credit report — whichever bureau produced it — is built from the same five sections. Learn the anatomy once and no report will intimidate you again.

Personal information: name variants, addresses, employers, date of birth. Errors here are usually harmless, but a stranger's address or an employer you never had can be the first visible symptom of a mixed file (someone else's data merged into yours) or identity theft. Start every review here.

Tradelines: the accounts. Each shows the creditor, a partially masked account number, the open date, the status (current, 30/60/90/120 days late, charge-off, repossession, foreclosure, included in bankruptcy), the balance, the limit, and a month-by-month payment history grid. The grid is where the story lives: a single "30" two years ago reads very differently than a run of escalating lates ending in a charge-off.

Collections: debts sold to or placed with collection agencies. Watch for the same original debt appearing twice — once as the original creditor's charge-off and again as a collection. That is normal; the same debt appearing under two different collection agencies at the same time usually is not.

Public records: since 2018 the bureaus have removed civil judgments and most tax liens from standard reports, so in practice this section means bankruptcies. Chapter 7 can remain for ten years from filing; Chapter 13 is typically removed after seven.

Inquiries: hard inquiries (you applied for credit) affect scores modestly and expire from the report after two years; soft inquiries are visible only to you.

Practice on the sample reports provided with this course — they are fictitious but built to look exactly like the real thing, from a clean file to a report carrying a bankruptcy, a repossession, and multiple collections.`,
      },
      {
        slug: "score-factors-ranked",
        title: "The Five Score Factors, Ranked by What You Can Control",
        content: `Knowing the factor weights is step one. Knowing which factors you can actually move this quarter is what turns knowledge into a plan. Ranked by controllability:

1. Revolving utilization (fast, fully controllable). The ratio of your credit card balances to your limits, measured per-card and overall, usually as of each statement date. Below 30% is the common guideline; below 10% is where top scores live. You can move this in one cycle by paying before the statement closes, asking for a limit increase, or spreading spend across cards. Because most score versions have no utilization memory, improvement shows up immediately.

2. Payment history going forward (slow but certain). You cannot change the past, but every on-time month dilutes it. Autopay the minimums on everything as a floor — the minimum protects the payment history factor even when you cannot pay in full.

3. New credit (fully controllable). Each application is a hard inquiry, and a burst of them looks like risk. When rate-shopping a mortgage or auto loan, cluster applications inside a short window — scoring models count them as one search.

4. Length of history (control by not breaking it). Closing your oldest card eventually shortens your history and immediately removes its limit from utilization. Keep old no-fee cards open with a small recurring charge.

5. Credit mix (barely worth chasing). Having both revolving and installment accounts helps slightly. Never open a loan you do not need just to diversify — the inquiry and the debt cost more than the mix helps.

Write your own ranking: for each factor, note your current state and one action. That one-page audit is the foundation the dispute and rebuilding modules build on.`,
      },
      {
        slug: "your-fcra-rights",
        title: "Your Rights Under the FCRA",
        content: `The Fair Credit Reporting Act (FCRA) is the federal law that governs credit reports, and it grants you specific, enforceable rights. Everything the dispute module teaches stands on these.

You have the right to see your data. Federal law guarantees free reports from each bureau through AnnualCreditReport.com — the bureaus currently offer them weekly. You are also entitled to a free report whenever you are denied credit based on one (the denial letter names the bureau used).

You have the right to dispute. Under FCRA Section 611, when you dispute an item with a bureau, it must conduct a reasonable reinvestigation, generally within 30 days (45 in some cases), forward your dispute and evidence to the company that furnished the data, and delete or correct anything that cannot be verified. Information that is accurate but negative does not have to be removed — the law targets errors, not history.

You have the right to time limits. Under Section 605, most negative items must age off after seven years from the original delinquency: late payments, charge-offs, collections, repossessions. Chapter 7 bankruptcy can remain for ten years from filing. Hard inquiries last two years. If an item is older than its limit and still reporting, that itself is a strong dispute.

You have the right to accuracy from furnishers. The companies that report your data have their own duties under Section 623, including correcting information they know is wrong and flagging accounts you have disputed.

You have remedies. Willful violations can carry statutory damages, and the FCRA is one of the areas where the arbitration module later in this course becomes relevant.

${LEGAL_EDUCATION_NOTE}`,
      },
    ],
  },
  {
    slug: "disputes",
    title: "Disputes & Letter Writing",
    requiredTier: "JOURNEYMAN",
    order: 2,
    description: "When to dispute, how to build evidence, and how to run the 30-day clock like a pro.",
    lessons: [
      {
        slug: "when-to-dispute",
        title: "When a Dispute Is the Right Tool",
        content: `A dispute is a scalpel, not a shotgun. Used on genuine errors it is the most powerful consumer tool in the FCRA. Used to carpet-bomb accurate information it wastes your credibility, invites the bureaus to deem your disputes frivolous, and can leave you worse positioned for the tools later in this course.

Dispute-worthy items fall into clear categories. Not mine: accounts from identity theft or a mixed file. Wrong status: a payment reported late that was on time, an account showing open that was closed, a paid collection still showing a balance, a discharged debt not marked "included in bankruptcy." Wrong numbers: balance, limit, or past-due amount that does not match reality. Too old: anything past its FCRA reporting limit — seven years from original delinquency for most negatives, ten for a Chapter 7. Duplicated: one debt appearing as two collections. Re-aged: a collector reporting a new "opened" date to make an old debt look fresh — this one is both common and serious.

Not dispute-worthy: an accurate late payment you actually made late, an accurate collection for a debt you owe, an accurate balance you dislike. For accurate-but-negative items your tools are different — goodwill requests to the original creditor, negotiated settlements (collections module), time, and the rebuilding module.

Before writing anything, inventory your reports from all three bureaus side by side. The same account frequently reports differently at each bureau, and each bureau requires its own dispute. Build a simple table: item, bureau(s), what is wrong, what evidence proves it. That table is the input to every template in the next lesson.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "choosing-templates",
        title: "Choosing the Right Template",
        content: `Templates are starting points that guarantee you hit the legally relevant elements — they are not magic spells. The bureaus' systems and staff have seen every template on the internet; what gets results is a correct legal basis plus specific facts plus evidence. Pick the template that matches the error type from your inventory table.

Bureau dispute (FCRA 611): the workhorse. Sent to the bureau reporting the error. Identifies the item exactly as it appears (creditor name and partial account number), states specifically what is inaccurate, states what the correct information is, and asks for reinvestigation. One item or a small set of related items per letter — giant multi-item letters are easier to dismiss.

Furnisher direct dispute (FCRA 623): sent to the creditor or collector doing the reporting. Useful when the bureau "verified" an item you know is wrong, because it forces the furnisher's own investigation duty.

Debt validation (FDCPA 1692g): technically a collections tool, covered fully in the collections module — but it belongs in your template inventory because an unvalidated collection is often also a disputable one.

Identity theft block (FCRA 605B): with an FTC identity theft report from IdentityTheft.gov, you can require bureaus to block fraudulent items — a different and faster mechanism than an ordinary dispute.

Goodwill request: not a dispute at all and carries no legal force. A short, honest letter to an original creditor asking them to remove an accurate late payment as a courtesy, strongest with a long relationship and a one-time slip.

What never to send: letters asserting the debt is invalid because of debt-elimination conspiracy theories, threats you will not carry out, or disputes of items you know are accurate. Every letter you send becomes part of the record.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "evidence-file",
        title: "Building Your Evidence File",
        content: `Disputes are decided on paper. The consumer with a bank statement beats the consumer with a paragraph of outrage, every time. Before sending your first letter, build the file.

For each disputed item, gather what proves your version: bank statements showing an on-time payment, the payoff or settlement letter for a "balance owing" account, the discharge order and schedules for anything bankruptcy-related, a police report or FTC identity theft report for fraud items, prior credit reports showing the original delinquency date for a re-aged debt. Screenshots of online banking are acceptable; label them with dates.

Assemble each dispute as a package: the letter, a copy (never the original) of each exhibit, and a copy of the report page showing the disputed item with it circled or highlighted. Reference the exhibits in the letter itself — "enclosed bank statement showing payment posted March 3" — so a reviewer working fast cannot miss the connection.

Send by mail, certified with return receipt, to the bureau's dispute address. Online dispute portals are convenient but constrain you to their categories, may limit what you can attach, and produce a weaker paper trail. Certified mail costs a few dollars and buys you a dated, signed record that the clock started.

Then maintain a dispute log — a single spreadsheet with: item, bureau, date sent, certified mail number, date delivered, deadline (delivery date plus 30 days), response date, and outcome. If this ever escalates to a CFPB complaint, an arbitration demand, or a lawyer, that log plus your certified receipts is the difference between a story and a case.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "thirty-day-clock",
        title: "Sending, Tracking, and the 30-Day Clock",
        content: `Once a bureau receives your dispute, FCRA Section 611 generally gives it 30 days to complete a reasonable reinvestigation — extendable to 45 days in limited situations, such as when you send relevant additional information mid-investigation. Knowing exactly how the clock works keeps you in control of the process instead of waiting anxiously.

Day zero is delivery, not mailing — this is why the certified mail return receipt matters. Log the delivery date and calculate your deadline immediately.

During the window, the bureau forwards your dispute (in practice, often as a compressed code plus your documents through the e-OSCAR system) to the furnisher, which must investigate and respond. This is worth understanding: your carefully assembled evidence can be reduced to a two-digit reason code. It is also why furnisher direct disputes exist as a second front, and why specific, well-organized letters fare better than rants — clarity survives compression.

When the clock expires, one of three things has happened. Deleted or corrected: you win; the bureau must send you an updated report, and the item cannot be reinserted without notice to you. Verified: the furnisher stood by the data — the next lesson covers your options. No response by the deadline: information that cannot be verified within the statutory window must be deleted. If day 35 passes silently, a short follow-up letter noting the expired deadline and requesting deletion is appropriate, and the missed deadline itself becomes part of your record.

Run one wave at a time. Sending wave two before wave one resolves makes your log ambiguous and your leverage weaker.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "reading-results",
        title: "Reinvestigation Results and What Comes Next",
        content: `The envelope from the bureau arrives. Read it as a chess player, not a lottery player — every outcome has a next move.

Deleted: victory, with housekeeping. Confirm the item is actually gone from a fresh copy of that bureau's report, check the other two bureaus for the same item, and file the results letter permanently — reinsertion without notice violates the FCRA, and your letter proves the deletion happened.

Corrected: confirm the correction is complete. A late payment corrected to current but still showing a wrong balance is half-fixed; dispute the remainder with the results letter as evidence.

Verified: the furnisher told the bureau the data is accurate. Your escalation ladder, in order: (1) a furnisher direct dispute under Section 623 with your full evidence — the furnisher must actually investigate, not rubber-stamp; (2) a CFPB complaint at consumerfinance.gov, which is free, fast to file, and gets routed to the company with a required response — attach your dispute log and receipts; (3) a request that the bureau add a 100-word consumer statement to the item; (4) for significant items with strong evidence, the legal routes — arbitration (covered in its own module) or an FCRA claim, where your certified-mail paper trail becomes the backbone of the case.

"Frivolous" designation: bureaus may decline substantially repeated disputes without new information. The cure is new evidence or a new legal basis, not the same letter louder.

Update your log, adjust the plan, and remember the long game: everything negative is aging toward its seven-year cliff while you work.

${LEGAL_EDUCATION_NOTE}`,
      },
    ],
  },
  {
    slug: "collections",
    title: "Debt Collectors & Collections",
    requiredTier: "JOURNEYMAN",
    order: 3,
    description: "FDCPA rights, validation, time-barred debt, and negotiating from strength.",
    lessons: [
      {
        slug: "fdcpa-rights",
        title: "Your Rights Under the FDCPA",
        content: `The Fair Debt Collection Practices Act (FDCPA) governs third-party debt collectors — collection agencies and debt buyers, and in most cases not the original creditor collecting its own debt (though many states extend similar rules to them). If a collection agency is calling, this law is your rulebook and theirs.

What collectors cannot do: harass you (repeated calls intended to annoy, abusive language, threats of violence); lie (misrepresent the amount owed, claim to be attorneys or government agents, threaten arrest — there is no debtors' prison — or threaten lawsuits they do not intend to file); or unfairly collect (add unauthorized fees, deposit postdated checks early). Under the CFPB's Regulation F, there is also a presumptive limit on call frequency — more than seven calls within seven days about a single debt, or calling within seven days of speaking with you about it, is presumed harassment.

What you can control: collectors may not contact you at times they know are inconvenient (before 8 a.m. or after 9 p.m. is presumed inconvenient), at work if told not to, or at all once you send a written cease-communication request — after which they may only confirm they are stopping or notify you of specific actions like a lawsuit. Use full cease letters strategically: silence is comfortable, but it can push a collector that still has legal options toward filing suit rather than negotiating.

Document everything: date, time, number, name, what was said. Many states allow recording calls (check your state's consent rule). FDCPA violations carry statutory damages up to $1,000 plus actual damages and attorney fees, which is why consumer lawyers take these cases — and why a good violation log is worth money.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "debt-validation",
        title: "Debt Validation: The First 30 Days",
        content: `Within five days of first contacting you, a collector must send a validation notice: the amount, the creditor's name, and a statement of your rights. From when you receive it, you have 30 days to demand validation in writing — and this window is the single most valuable moment in any collection account's life. Do not spend it on the phone.

A proper validation request asks the collector to verify the debt: who the original creditor was, an itemization of the amount (principal, interest, fees), and evidence of the collector's right to collect it. Send it certified mail, return receipt, within the 30 days. Once received, the collector must pause collection until it responds with verification.

Why this matters more than ever: debts are sold in bulk portfolios, often as little more than a spreadsheet row. By the second or third resale, documentation is frequently thin or missing. A debt buyer that cannot produce documentation has a problem — continuing to collect an unvalidated debt after a timely demand is an FDCPA violation, and reporting it to the bureaus while unvalidated hands you a parallel FCRA dispute ("collector failed to validate; item is unverified").

If validation arrives and checks out, you have lost nothing — you now know exactly what you are dealing with and can move to the negotiation lesson. If it does not arrive, or arrives as a bare computer printout with no itemization, your position strengthens on every front: dispute the tradeline, complain to the CFPB with your paper trail, and treat any renewed collection activity as a potential statutory-damages claim.

Missing the 30-day window does not erase the debt rights above — you can still request verification — but the automatic collection pause only attaches to the timely demand. Calendar it the day the notice arrives.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "time-barred-debt",
        title: "Statutes of Limitation and Time-Barred Debt",
        content: `Every debt has two clocks, and confusing them is the most expensive mistake in this module. The FCRA reporting clock (about seven years) controls how long a collection can appear on your credit report. The statute of limitations (SOL) controls how long a creditor can successfully sue you — typically three to six years depending on your state and the debt type, and sometimes the contract's choice-of-law clause.

The clocks are independent. A debt can be sueable but off your report; far more commonly, it is on your report but time-barred — too old to enforce in court. Collectors can generally still ask you to pay a time-barred debt (some states restrict even that), but suing on one is an FDCPA violation, and under Regulation F, so is threatening to.

Now the trap: in many states, making a partial payment — or even signing a written acknowledgment of the debt — restarts the statute of limitations. A collector who convinces you to pay $25 in "good faith" on a five-year-old debt may have just converted an unenforceable claim into a fresh, sueable one. This is why the sequence in this module is strict: identify the debt's age and your state's SOL before you say anything about paying.

To establish the dates, use the original delinquency date from your credit report and your validation-request itemization. If you are sued on any debt, never ignore it — a default judgment converts even a shaky claim into an enforceable one with wage garnishment potential. Show up, and raise the SOL as a defense if it applies; in most places the court will not raise it for you.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "negotiating-settlements",
        title: "Negotiating: Settlements and Pay-for-Delete",
        content: `You negotiate a collection only after the earlier lessons are done: the debt is validated, inside the SOL analysis, and worth resolving. Then you negotiate from facts, not fear.

Know the economics. A debt buyer may have paid pennies on the dollar for your account; original creditors' recovery expectations on charged-off debt are also low. Settlements of 30–60% of the balance are routinely accepted, and lump sums beat payment plans — a collector will often take less today than more over a year. Start lower than you expect to land and never volunteer your maximum.

Know what you are buying. A settlement resolves the debt; it does not automatically fix your report. Negotiate the reporting as part of the deal. Best outcome: deletion of the tradeline ("pay for delete") — collectors historically resisted this, but it has become more common, especially among debt buyers. Acceptable: "paid in full" or "settled" with a zero balance — under newer scoring models (FICO 9, 10, VantageScore 3+), a zero-balance collection is ignored or weighted far less, though many lenders still use older models. Unacceptable: paying with no agreement about reporting at all.

The iron rule: nothing is real until it is in writing. Get the offer — amount, deadline, reporting treatment, and language that the payment resolves the account in full with no further collection — on paper or in an email before any money moves. Pay traceably (never a personal check with your account number; never direct bank access). Then verify the reporting change on all three bureaus about 45 days later, with your written agreement ready as dispute evidence if it does not happen.

One more consideration: forgiven debt over $600 can generate a 1099-C and taxable income. Factor it into the math.

${LEGAL_EDUCATION_NOTE}`,
      },
    ],
  },
  {
    slug: "bankruptcy",
    title: "Understanding Bankruptcy",
    requiredTier: "MASTER",
    order: 4,
    description: "Chapter 7 vs 13, the means test, what discharge really does, and rebuilding after it.",
    lessons: [
      {
        slug: "ch7-vs-ch13",
        title: "Chapter 7 vs Chapter 13: The Honest Comparison",
        content: `Bankruptcy is neither a moral failure nor a magic eraser. It is a legal reset mechanism as old as the republic, used by hundreds of thousands of households every year — and the right question is never "is bankruptcy bad?" but "is it cheaper than the alternative, in money and in years?"

Chapter 7 — liquidation — is the fast one. A trustee is appointed, non-exempt assets (in practice, most filers have none once state or federal exemptions are applied) can be sold to pay creditors, and qualifying debts are discharged, typically about three to six months after filing. It is designed for people whose income cannot realistically service their debts. Eligibility runs through the means test, covered next lesson.

Chapter 13 — reorganization — is the structured one. You keep your assets and commit your disposable income to a court-approved repayment plan for three to five years; whatever qualifying debt remains at the end is discharged. It exists for people with regular income who need protection while they catch up — classically, to stop a foreclosure and cure mortgage arrears over the plan, something Chapter 7 cannot do.

The shared superpower is the automatic stay: the moment either petition is filed, essentially all collection stops — calls, lawsuits, garnishments, repossessions, foreclosure sales — by operation of law.

The honest trade-offs: Chapter 7 can remain on your credit report for ten years from filing versus about seven for Chapter 13; Chapter 13 costs more in total and fails more often (plans span years, and life happens); Chapter 7 can expose non-exempt assets. Ability to choose between them is itself governed by the means test, and repeat filings face time limits between discharges.

The sample "bankruptcy-ch7" credit report in this course shows exactly what a post-discharge file looks like — study it alongside this module.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "means-test",
        title: "The Means Test and Who Qualifies",
        content: `The 2005 bankruptcy reform (BAPCPA) built a gate in front of Chapter 7 called the means test. Its purpose is simple: people with genuinely high disposable income are pushed toward Chapter 13 repayment instead of Chapter 7 liquidation. Understanding the gate tells you which door you are likely walking through.

Step one is the median-income screen. Take your household's average gross income over the six full months before filing, annualize it, and compare it to the median income for a household of your size in your state (the Department of Justice's U.S. Trustee Program publishes the current tables). At or below the median: you pass, and the analysis usually ends there — most Chapter 7 filers qualify this way.

Step two, for above-median filers, is the full calculation: from your income, subtract allowed expenses — some at IRS standard amounts, some actual — to compute monthly disposable income. If enough remains to meaningfully repay creditors over five years, a Chapter 7 filing is presumed abusive, and Chapter 13 (or dismissal) is the path. The expense standards are technical, and above-median cases are exactly where an experienced bankruptcy attorney earns their fee — small classification choices change outcomes.

Details that surprise people: the six-month lookback means timing matters — a recent layoff may not show up in your average yet, and waiting a month or two can change the result; Social Security income is excluded from the calculation; primarily non-consumer (business) debts are exempt from the means test entirely; and passing the means test is necessary but not sufficient — the totality of circumstances still applies.

Most courts' required credit counseling (a pre-filing briefing from an approved agency, done online in under two hours) will also run your numbers — treat it as a free second opinion.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "what-discharge-covers",
        title: "What Bankruptcy Does — and Does Not — Erase",
        content: `Discharge is the payoff of the entire process: a permanent federal injunction against collecting the discharged debts. But its edges are exact, and filers who assume everything disappears get hurt by the exceptions.

Generally discharged: credit card balances, medical debt, personal loans, payday loans, old utility and telecom balances, deficiency balances after repossession or foreclosure, most unsecured debt, and in many cases older income tax debt that meets specific timing rules.

Generally not discharged: domestic support obligations (child support, alimony) — never; most student loans, unless you win a separate "undue hardship" proceeding (historically hard, though recent government guidance has made federal-loan hardship discharges more attainable than their reputation suggests); recent income taxes and all payroll taxes; court fines, restitution, and most government penalties; debts incurred by fraud, and large luxury purchases or cash advances taken shortly before filing (presumed fraudulent); debts from DUI injury; and anything you fail to list in your schedules.

Secured debts get the most misunderstood treatment: discharge wipes your personal liability, but the lien survives. Discharging a car loan means the lender cannot sue you — but it can still repossess the car. You choose among surrendering the collateral, redeeming it for its current value, or (for cars) reaffirming the debt — re-signing personal liability to keep it. Reaffirm cautiously; you are volunteering back into a debt the law just released you from, and courts scrutinize these agreements for good reason.

After discharge, your credit reports must show included accounts as "included in bankruptcy" with zero balance — a collector re-reporting a discharged debt as owing is both an FCRA dispute and a potential discharge-injunction violation, enforceable in the bankruptcy court. Keep your discharge order and schedules forever; they are your proof.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "filing-process",
        title: "Filing: Process, Costs, and Timeline",
        content: `Here is the machinery of a consumer bankruptcy from decision to discharge, so none of it surprises you.

Before filing: complete the required credit counseling briefing from an approved nonprofit agency (online, roughly an hour or two, modest fee that can be waived) within 180 days before filing. Gather the documentary skeleton: several years of tax returns, six-plus months of pay stubs and bank statements, and a complete list of debts, assets, income, and recent transfers. Completeness is not optional — omitted debts may survive discharge, and omitted assets are how filings turn into fraud problems.

Filing: the petition plus schedules runs dozens of pages. Court filing fees are set nationally (a few hundred dollars — recently about $338 for Chapter 7 and $313 for Chapter 13; check current amounts), with installment and waiver options for low-income Chapter 7 filers. Attorney fees vary by market — commonly in the low-to-mid four figures for a Chapter 7; Chapter 13 fees are typically larger but usually paid through the plan. Filing "pro se" (without a lawyer) is legal and works best in genuinely simple no-asset Chapter 7 cases; Chapter 13 pro se success rates are poor.

The moment of filing triggers the automatic stay — all collection stops.

After filing: roughly a month later comes the 341 meeting of creditors — despite the name, usually a ten-minute recorded session where the trustee verifies your identity and asks standard questions about your paperwork; creditors rarely attend. Complete the second required course (debtor education) before discharge. In a no-asset Chapter 7, discharge typically arrives about 60–90 days after the 341 meeting — three to six months end to end. In Chapter 13, confirmation of your plan comes first, then three to five years of plan payments, then discharge.

Then the real work begins: the rebuilding lesson.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "life-after-discharge",
        title: "Life After Discharge: Rebuilding from the Bottom",
        content: `The day your discharge enters, your score is bruised — but your risk profile has quietly improved: you have less debt than you have had in years and a legal bar on repeat Chapter 7 discharges for eight years, and lenders know both. Post-bankruptcy rebuilding is more predictable than most people expect. The playbook:

First 90 days — audit. Pull all three reports and verify every included account shows "included in bankruptcy," zero balance, zero past-due. Mis-reporting of discharged debt is one of the most common post-bankruptcy credit errors, and you learned the dispute machinery two modules ago. Your discharge order is Exhibit A.

Months 1–6 — re-establish one clean line. A secured credit card (your deposit sets the limit) from a lender that reports to all three bureaus is the standard first step; some credit unions offer credit-builder loans that serve the same purpose. Use the card for one small recurring charge, autopay in full, keep utilization under 10%. You are not borrowing; you are generating on-time data points.

Months 6–24 — let the machine work. Payment history compounds. Post-discharge scores in the mid-500s commonly reach the mid-600s within one to two years of perfect payments and low utilization. Add a second line only when the first is boringly established. Expect card offers to reappear surprisingly fast — lenders actively market to recent discharges — and accept them selectively.

Ongoing — protect the story. Chapter 7 reports for up to ten years from filing, Chapter 13 about seven, but the bankruptcy's scoring weight fades steadily while your new history grows. FHA mortgage eligibility is possible roughly two years after a Chapter 7 discharge (with re-established credit), sometimes sooner after Chapter 13 with plan-payment history.

The fictitious "bankruptcy-ch7" sample report in this course shows this exact arc mid-flight: discharged accounts reporting correctly, one secured card, six months of clean history. That is what winning looks like at month six.

${LEGAL_EDUCATION_NOTE}`,
      },
    ],
  },
  {
    slug: "arbitration",
    title: "Arbitration Essentials",
    requiredTier: "MASTER",
    order: 5,
    description: "Using the arbitration clause they wrote — process, costs, strategy, and preparation.",
    lessons: [
      {
        slug: "what-arbitration-is",
        title: "What Consumer Arbitration Is (and Isn't)",
        content: `Arbitration is private dispute resolution: instead of a judge and jury, a neutral arbitrator — usually a lawyer or retired judge — hears both sides and issues a binding award. Nearly every credit card agreement, and most agreements with banks, collectors that step into their shoes, and even the credit bureaus' products, contains a pre-dispute arbitration clause requiring disputes to go there instead of court.

These clauses were written to protect companies — they generally block class actions and keep disputes out of public courtrooms. The strategic insight behind this module is that the clause binds both directions. A consumer with a genuine individual claim — an FCRA violation a bureau will not fix, an FDCPA violation with a documented paper trail — can invoke the company's own clause, and the consumer-protective rules the major arbitration forums adopted make it unusually accessible: filing fees for consumers are capped at a small fraction of the company's share, hearings can be by document submission or phone, and the process runs months rather than years.

Being honest about the trade-offs: arbitration awards are essentially final — court review is extraordinarily narrow (fraud, arbitrator misconduct, and similar), so a bad award mostly cannot be appealed. Discovery is limited compared to court. Repeat-player dynamics are real, even if the consumer-rules reforms blunt them. And arbitration only fits claims — legal violations with evidence — not grievances about accurate information you dislike.

Know the alternatives before choosing the forum: most clauses contain a small-claims carve-out (either side may go to small claims court instead, which for modest, simple claims may be faster and cheaper), and a CFPB complaint remains the free first escalation. Arbitration is the tool for the documented, unresolved, meaningful claim. What follows: finding your clause, understanding the forums and costs, walking the timeline, and building the file.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "finding-your-clause",
        title: "Finding and Reading the Arbitration Clause",
        content: `Before anything else, you need the actual contract language that governs your dispute — because the clause dictates the forum, the rules, who pays what, and whether you can choose court instead.

Where to find it: your cardmember or account agreement — the current version is usually available in your online account's documents section. For credit cards specifically, the CFPB maintains a public database of card agreements searchable by issuer. For a debt that has been sold, the debt buyer generally stands in the original creditor's shoes and the original agreement's clause typically still controls. For the bureaus, arbitration language commonly appears in the terms of paid products (monitoring subscriptions), while disputes arising purely under the FCRA may not be covered by any agreement at all — which cuts in your favor: no clause means court remains open, including small claims.

What to extract, with a highlighter: (1) The forum — AAA or JAMS, almost always; the clause binds the company to that forum's consumer rules. (2) The rules and cost allocation — most clauses promise the company pays most or all arbitration costs beyond your capped filing fee; some promise to pay everything if you win anything. (3) The small-claims carve-out — preserving your right to that alternative. (4) The opt-out window — many agreements let new customers reject arbitration by written notice within 30–60 days of account opening; if you are inside a window on a new account, sending the opt-out preserves your court rights forever. (5) Notice and informal-resolution requirements — many clauses require a written pre-dispute notice and a 30-day negotiation period before filing; skipping it can get a case bounced.

Save a dated PDF of the full agreement. In the timeline lesson, that pre-dispute notice letter becomes your opening move — and it settles a meaningful share of cases by itself.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "forums-and-costs",
        title: "AAA and JAMS: Consumer Rules and Costs",
        content: `Two private organizations administer nearly all consumer arbitration in the United States: the American Arbitration Association (AAA) and JAMS. Your clause names one. Both publish consumer-specific rules that override their commercial rules when a business's standardized contract is involved — and those consumer rules are what make this process financially accessible.

The consumer cost caps are the headline. Under the AAA's consumer rules, the consumer's filing fee has been capped at a few hundred dollars (around $225 in recent years), with the business responsible for the substantially larger remainder — arbitrator compensation, case management, and hearing fees, typically thousands of dollars. JAMS's consumer minimum standards similarly cap the consumer's total contribution (around $250 recently), with the company paying the rest. Verify current amounts on the forums' published fee schedules before filing. Fee waivers exist for financial hardship, and many clauses promise the company will pay even your capped share on request or if you prevail.

Notice the strategic asymmetry this creates: the moment you file, the company faces a four-figure administrative bill regardless of outcome — often exceeding the amount in dispute. This is why well-documented arbitration demands frequently settle during the forum's initial administrative window, and it is also why you must file honestly: forums can and do decline to administer abusive mass filings, and an arbitrator can allocate costs differently upon finding a claim frivolous.

Also load-bearing: both forums require the business to comply with consumer standards — companies that fail to pay their share or whose clauses violate the standards can be refused administration, which in many jurisdictions reopens the courthouse doors. Both forums default consumer hearings to inexpensive formats — documents-only or telephone — with in-person hearings available where warranted. An arbitrator's award is enforceable in court under the Federal Arbitration Act if the company does not pay.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "process-timeline",
        title: "The Process Timeline, Step by Step",
        content: `Here is a consumer arbitration from first letter to enforceable award. Durations are typical, not promised.

Step 0 — pre-dispute notice (30–60 days). If your clause requires it — most modern ones do — send the written notice of dispute it describes: who you are, the facts, the legal basis, what you want. Certified mail. A meaningful share of documented disputes settle right here, because the company's next stop costs it thousands in forum fees.

Step 1 — the demand. Draft the demand for arbitration: parties, the agreement and its arbitration clause, a numbered statement of facts, the claims (the specific statutes violated and how), and the relief sought — statutory damages, actual damages, correction of the reporting, costs. File with the named forum (both accept online filing) with your capped filing fee, and serve the company as the rules require.

Step 2 — administration (first weeks). The forum confirms the clause meets its consumer standards and bills the company its share. Nonpayment or noncompliance can end administration — document it if it happens; it may reopen court options.

Step 3 — arbitrator appointment and preliminary conference (weeks 4–10). Both sides receive a list of candidate arbitrators with disclosures and may strike or rank them. A preliminary call sets the schedule, the exchange of information, and the hearing format — documents-only, phone, or in-person.

Step 4 — exchange and preparation (months 2–4). Discovery is streamlined: relevant documents and perhaps a brief. Your evidence file from the disputes module — certified receipts, dispute log, responses, damages documentation — slots in directly.

Step 5 — hearing and award (months 4–8). Documents-only cases are decided on submissions; hearings otherwise run hours, not days. The award typically issues within 30 days of closing, and under most consumer clauses the company must pay promptly; if not, a court will confirm the award into an enforceable judgment.

Settlement can — and often does — interrupt at any step. Every step you complete increases the number behind your signature.

${LEGAL_EDUCATION_NOTE}`,
      },
      {
        slug: "preparing-with-ai",
        title: "Preparing Your Case File — and How AI Can Help",
        content: `Arbitration rewards preparation over eloquence. The winning consumer file is organized, chronological, and boring — and modern AI tools are genuinely useful for building it, provided you use them as a paralegal, never as your lawyer.

The case file, in order: (1) a one-page chronology — every event, dated, from first error to today; (2) the agreement, with the arbitration clause flagged; (3) your dispute log and every certified-mail receipt; (4) each letter sent and each response received; (5) the credit reports showing the item over time; (6) damages documentation — credit denials, rate increases, or the adverse-action letters that tie harm to the reporting; (7) your demand, which tells the story the exhibits prove.

Where AI genuinely helps: summarizing a sixty-page card agreement and locating the arbitration, notice, and cost provisions in minutes; turning a shoebox of dated letters into a clean chronology; explaining a statute's elements in plain language so you can check your facts against each element; stress-testing your story ("what would the company's lawyer say back?"); and drafting outlines for a notice letter or demand that you then rewrite in your own words with your own facts.

Where AI must not be trusted: legal citations (models fabricate cases and section numbers with total confidence — every citation you use must be verified against the primary source, and courts have sanctioned filers for skipping this); current fee schedules and deadlines (check the forum's website, not a model's memory); state-specific rules; and judgment calls — whether to settle, what a claim is worth, whether to escalate at all. Verify anything an AI tells you before it goes into a filing, including anything this platform's assistant tells you.

The discipline to remember: AI accelerates the work; it does not carry the responsibility. Every document that goes out has your name on it. For claims with real money at stake, one hour of a consumer attorney's time reviewing your assembled file — and many FCRA/FDCPA attorneys work on contingency precisely because these statutes fee-shift — is the highest-value purchase in this entire course.

${LEGAL_EDUCATION_NOTE}`,
      },
    ],
  },
  {
    slug: "rebuilding",
    title: "From Repair to Prosperity",
    requiredTier: "HERO",
    order: 6,
    description: "The capstone: engineering a durable score and turning repaired credit into real financial ground.",
    lessons: [
      {
        slug: "rebuild-toolkit",
        title: "The Rebuild Toolkit: Secured Cards, Builders, and AU Status",
        content: `Repair removes the wrong negatives; rebuilding manufactures new positives. The tools are unglamorous and extremely reliable — what matters is sequencing them and letting time compound.

Secured credit cards are the foundation tool. Your refundable deposit sets your limit; the card otherwise works — and reports — like any card. Selection criteria, in order: reports to all three bureaus (non-negotiable), no annual fee or a trivial one, and a published path to graduate to unsecured with deposit back. Use it for one small recurring charge and autopay in full. After six to twelve clean months, request graduation or a limit increase.

Credit-builder loans invert a loan: the credited amount sits in a locked savings account while you make the payments, and you receive the money at the end. Twelve to twenty-four months of installment payment history for a small monthly cost, commonly available at credit unions — which also tend to be the most forgiving lenders for the next real loan.

Authorized user (AU) status adds you to someone else's card; their history on that card can appear on your report. It works when the primary user has long, clean history and low utilization — and it can hurt when they do not. You do not need to possess or use the card. Family only; paid "tradeline rental" services live in a gray zone lenders actively screen against.

Rent and utility reporting services can add otherwise-invisible on-time history; coverage across bureaus and scoring models varies, so treat them as a supplement, never the plan.

The sequencing: one secured card first. Add a builder loan around month three if the budget is comfortable. AU status whenever a qualified family member offers. Second card only after the first graduates. Every account you open must be one you can autopay forever — a single new 30-day late costs more than every tool here gains.`,
      },
      {
        slug: "utilization-engineering",
        title: "Utilization Engineering",
        content: `Utilization — your reported card balances divided by your limits — is roughly 30% of your score, has no memory in most scoring versions, and is fully under your control. That combination makes it the highest-leverage number in credit, and "engineering" it is mostly about understanding when the snapshot is taken.

The mechanics: most issuers report your statement balance, on the statement closing date — not what you owe after payday, and not the due date. You can pay in full every month and still report 95% utilization if your statement closes while the balance is high. The fix is the AZEO-adjacent playbook: pay each card down before its closing date, so the snapshot shows what you want it to show.

The thresholds that matter, per card and overall: under 30% is acceptable, under 10% is strong, and 1–9% on one card with 0% on the rest ("all zero except one") typically scores marginally better than literal all-zero, which some models read as inactivity. Above 50% on any single card drags noticeably; a maxed card drags hard even if overall utilization is low — the models look at both.

The denominators are also movable. Limit increases on aged, well-handled cards raise the denominator without new debt — many issuers grant soft-pull increases after six to twelve clean months; ask. Keeping old no-fee cards open preserves their limits in your total. Consolidating card balances into an installment loan removes them from revolving utilization entirely (installment balances barely affect this factor) — arithmetic that works only if the freed cards stay near zero afterward.

Timing application moves: because utilization has no memory, a coordinated pay-down two statement cycles before a mortgage or auto application is legitimate, effective, and standard practice. Know your closing dates, set the calendar, and take the snapshot on your terms.`,
      },
      {
        slug: "repair-to-prosperity",
        title: "From Repaired Credit to Real Wealth",
        content: `A repaired score is not the prize. It is the key that stops wealth from leaking. This capstone lesson connects the course to the reason you took it — and it is the lesson behind this platform's name: Plutus, the Greek god of wealth, was blinded so that fortune would be distributed without regard to merit. Education is how you stop depending on blind luck.

Count the leak you just plugged. The gap between deep-subprime and prime pricing is enormous: on a typical used-car loan the APR spread can exceed ten percentage points — thousands of dollars over one loan. On a mortgage, a 100-point score difference can move the rate enough to change the total cost by tens of thousands. Bad credit also taxes the everyday: security deposits, insurance pricing in most states, even job screening in some fields. A repaired score is a permanent raise you gave yourself. The mistake is to spend the raise on new debt service.

Redirect the delta deliberately, in this order. First, a starter emergency fund — even $1,000 — because the emergency fund is credit protection: the most common relapse into delinquency is an ordinary emergency landing on a card that then can't be paid. Then attack remaining high-interest balances (avalanche pays the most; snowball keeps some people going — the one you finish is the right one). Then extend the fund toward three months of expenses, and only then look further.

Beyond that line, this course hands you off: retirement accounts, investing, and tax strategy are their own disciplines with their own experts, and this platform teaches credit, not investments. What we can tell you is structural: the on-time automation, the utilization discipline, and the paper-trail habits you built here are the same habits every subsequent financial layer is built on.

You came for a score. Leave with the operating system.`,
      },
      {
        slug: "monitoring-and-defending",
        title: "Monitoring and Defending Your Progress",
        content: `Everything you have built is data on someone else's servers, maintained by systems that make mistakes at scale. The final skill is defense: a light, permanent routine that catches problems while they are one letter — not one module — away from fixed.

The quarterly routine (thirty minutes): pull one bureau's free report through AnnualCreditReport.com on a rotating schedule — Equifax in January, Experian in May, TransUnion in September, or weekly whenever something is in motion. Scan in the order you learned in Foundations: personal info (mixed-file and identity-theft symptoms first), tradelines (statuses, balances, anything you don't recognize), collections (anything new or re-aged), inquiries (hard pulls you didn't authorize). Log anything wrong and run the disputes playbook the same week — errors are easiest to kill young, before they propagate between bureaus.

The standing defenses: security freezes at all three bureaus are free, take minutes online, and block new-account fraud at the root — thaw temporarily when you apply for credit. Freezes beat paid "monitoring" for prevention; monitoring alerts you after the fact. Fraud alerts are the lighter one-year option. Freeze the secondary bureaus too if you want to be thorough (ChexSystems for bank accounts; LexisNexis and Innovis exist and accept freezes).

The annual review (one hour): all three reports side by side, the same table you built in Foundations. Confirm aged items fell off on schedule — seven years from original delinquency for most negatives, ten for a Chapter 7 — and dispute anything overstaying with the obsolescence rules you already know. Check that your utilization setup, autopays, and old-card keepalive charges are still running.

Keep the archive: your dispute logs, certified receipts, settlement agreements, and discharge papers, forever. You are the best-documented consumer any furnisher will deal with this year — that, more than any score, is what this course was building.`,
      },
    ],
  },
];
