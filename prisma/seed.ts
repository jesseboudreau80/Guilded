import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create initial modules
  const modules = [
    {
      title: "Credit Fundamentals",
      description:
        "Learn the foundational concepts of credit — what it is, how it works, and why it matters.",
      requiredTier: "APPRENTICE" as const,
      order: 1,
      isPublished: true,
      lessons: [
        {
          title: "What Is Credit?",
          content: `Credit is the ability to borrow money or access goods or services with the understanding that you'll pay later.

Your credit history is a record of how you've managed borrowed money. Lenders use this history to decide:
- Whether to lend you money
- How much to lend
- What interest rate to charge

Key types of credit:
- Revolving credit (credit cards, lines of credit)
- Installment credit (mortgages, auto loans, student loans)
- Open credit (utilities, charge cards)

Understanding the difference between these types is the first step in mastering your financial literacy.

Educational Note: This content is for informational purposes only and does not constitute financial advice.`,
          order: 1,
          isPublished: true,
        },
        {
          title: "Understanding Credit Bureaus",
          content: `There are three major credit bureaus in the United States:

1. Equifax
2. Experian
3. TransUnion

Each bureau maintains an independent credit file on you. Lenders typically report to one or more bureaus, meaning your reports may differ slightly between bureaus.

You are entitled to one free credit report per bureau per year through AnnualCreditReport.com — the only federally authorized source.

What's in your credit report:
- Personal information (name, addresses, SSN)
- Account information (credit cards, loans)
- Public records (bankruptcies)
- Inquiries (who has checked your credit)

Educational Note: Monitoring your credit reports regularly is a responsible financial habit.`,
          order: 2,
          isPublished: true,
        },
        {
          title: "How Credit Scores Are Calculated",
          content: `Credit scores are numerical representations of your creditworthiness. The FICO Score is the most widely used model.

FICO Score breakdown:
- Payment History (35%) — Do you pay on time?
- Amounts Owed (30%) — How much of your available credit are you using?
- Length of Credit History (15%) — How long have your accounts been open?
- New Credit (10%) — Have you recently applied for new credit?
- Credit Mix (10%) — Do you have a mix of credit types?

Score ranges (FICO):
- 300–579: Poor
- 580–669: Fair
- 670–739: Good
- 740–799: Very Good
- 800–850: Exceptional

Educational Note: Different lenders use different scoring models. Your score may vary depending on which model is used.`,
          order: 3,
          isPublished: true,
        },
      ],
    },
    {
      title: "Reading Your Credit Report",
      description:
        "Learn to read, interpret, and understand every section of your credit report.",
      requiredTier: "JOURNEYMAN" as const,
      order: 2,
      isPublished: true,
      lessons: [
        {
          title: "Anatomy of a Credit Report",
          content: `Your credit report is divided into several sections. Here's how to read each one:

1. Personal Information Section
Contains your name, current and previous addresses, date of birth, employment information, and Social Security Number (last 4 digits typically).

Action: Verify all personal information is accurate.

2. Account Information Section
Lists all credit accounts — open and closed. Each entry shows:
- Creditor name and account number (partial)
- Account type and status
- Credit limit or loan amount
- Current balance
- Payment history (month-by-month)

3. Public Records Section
Includes bankruptcies and civil judgments.

4. Inquiries Section
Hard inquiries (from credit applications) remain for 2 years. Soft inquiries don't affect your score.

Educational Note: You have the right to dispute inaccurate information under the Fair Credit Reporting Act (FCRA).`,
          order: 1,
          isPublished: true,
        },
        {
          title: "Identifying Errors and Inaccuracies",
          content: `Common credit report errors include:

1. Wrong personal information
- Incorrect name spelling
- Wrong address
- Someone else's accounts (common with similar names)

2. Account errors
- Accounts you don't recognize (possible identity theft)
- Incorrect account status (showing as open when closed)
- Wrong credit limits
- Duplicate accounts

3. Payment history errors
- Late payments incorrectly reported
- Payments reported as missed when paid

4. Outdated negative information
Most negative information must be removed after 7 years. Bankruptcies can remain for 10 years.

Your rights under FCRA:
- Right to dispute inaccurate information
- Credit bureaus must investigate within 30 days
- You can add a 100-word statement to your report

Educational Note: Regularly reviewing your credit reports is the best way to catch errors early.`,
          order: 2,
          isPublished: true,
        },
      ],
    },
    {
      title: "Dispute Process Education",
      description:
        "Understand the complete dispute process — from identifying errors to escalation.",
      requiredTier: "JOURNEYMAN" as const,
      order: 3,
      isPublished: true,
      lessons: [
        {
          title: "How to File a Dispute",
          content: `Filing a dispute with a credit bureau is your legal right under the Fair Credit Reporting Act (FCRA).

Steps to file a dispute:

1. Gather documentation
Collect supporting evidence for your dispute — statements, payment confirmations, correspondence.

2. Choose your dispute method
- Online: Each bureau has an online dispute portal
- Mail: Written disputes with return receipt requested
- Phone: Less recommended due to limited documentation trail

3. Write your dispute letter
Clearly identify:
- The specific item being disputed
- Why you believe it is inaccurate
- What correction you are requesting
- Supporting documentation references

4. Send to the correct bureau
File with the bureau reporting the error — you may need to dispute with all three.

5. Follow up
Bureaus must respond within 30 days. Keep records of all correspondence.

Educational Note: Templates in our document library show example dispute letter formats for educational reference only.`,
          order: 1,
          isPublished: true,
        },
      ],
    },
    {
      title: "Arbitration & Consumer Rights",
      description:
        "Advanced education on consumer rights, arbitration processes, and legal frameworks.",
      requiredTier: "MASTER" as const,
      order: 4,
      isPublished: true,
      lessons: [
        {
          title: "FCRA Consumer Rights Overview",
          content: `The Fair Credit Reporting Act (FCRA) provides consumers with significant rights regarding their credit information.

Key rights under FCRA:

Right to Access Your Report
You are entitled to a free copy of your credit report from each bureau annually, plus additional free copies in certain circumstances.

Right to Dispute Inaccuracies
You can dispute any information you believe is inaccurate or incomplete.

Right to Know Who Has Accessed Your File
You can see who has requested your credit report.

Right to Seek Damages for Violations
If a credit bureau or furnisher violates FCRA, you may be entitled to actual damages, statutory damages, and attorney's fees.

Statute of Limitations
FCRA claims must typically be filed within 2 years of discovery of the violation (or 5 years from the date of violation).

Educational Note: This is educational information about the FCRA. Consult a consumer rights attorney for advice specific to your situation.`,
          order: 1,
          isPublished: true,
        },
      ],
    },
  ];

  for (const moduleData of modules) {
    const { lessons, ...moduleFields } = moduleData;

    const existingModule = await prisma.module.findFirst({
      where: { title: moduleFields.title },
    });

    if (!existingModule) {
      const created = await prisma.module.create({
        data: {
          ...moduleFields,
          lessons: {
            create: lessons,
          },
        },
      });
      console.log(`Created module: ${created.title}`);
    } else {
      console.log(`Module already exists: ${moduleFields.title}`);
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
