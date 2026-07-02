# Synthetic Credit Report Fixtures

Sample credit reports for **testing and education only**. Every file in this
directory describes a fictitious person. Nothing here is, or is derived from,
a real consumer record.

Safety rails baked into the schema (`types/credit-report.ts`):

- `synthetic: true` and a mandatory verbatim disclaimer on every report
- SSNs always use the `999-XX-####` form — the 999 area number is never
  issued to real people
- Obviously fictional names, creditors ("Sample National Bank",
  "Fixture Auto Finance"), and addresses ("Springfield, US 0000x")
- All money values are integer cents

## Personas

| File | Scenario | Scores (EQ/EX/TU) |
| --- | --- | --- |
| `clean-baseline` | Control persona, no derogatory marks | 782/789/778 |
| `late-payments` | Scattered 30/60/90-day lates, no collections | 641/652/636 |
| `collections-chargeoff` | Medical + telecom collections, charged-off card | 568/574/561 |
| `bankruptcy-ch7` | Discharged Chapter 7 with included accounts, post-BK secured card | 542/549/538 |
| `repo-judgment` | Auto repossession with deficiency collection, civil judgment, tax lien | 521/530/516 |
| `kitchen-sink` | Chapter 13 filing, foreclosure, charge-offs, collections, maxed utilization, heavy inquiries | 487/495/481 |

Each persona ships as `.json` (machine-readable, validated by
`creditReportSchema`) and `.txt` (human-readable tri-bureau-style rendering
for testers and lesson content).

## Usage

- **Manual testing / beta testers:** hand testers the `.txt` files as the
  "report" they work from while walking the dispute-letter and lesson flows.
- **Automated tests:** import the `.json` files; `tests/credit-report-fixtures.test.ts`
  validates all of them against the schema and re-checks summary math.
- **AI assistant testing:** paste report sections into the AI assistant to
  verify educational answers about lates, collections, and bankruptcies.

## Regenerating / adding personas

Fixtures are produced deterministically by `scripts/generate-credit-reports.ts`.
Edit or add a persona there, then:

```bash
npm run fixtures:generate
```

Do not hand-edit the `.json`/`.txt` outputs — they will be overwritten.
