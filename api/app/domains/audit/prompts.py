EXTRACTION_SYSTEM = """You are a credit report analyst specializing in trade line extraction.
Extract all credit accounts from the provided report text.
Return ONLY valid JSON. No explanation, no markdown, no extra text."""

EXTRACTION_USER = """Extract every credit account from this credit report. For each account identify:
- creditor_name: exact name as shown
- account_number: last 4 digits of account number if visible (e.g. "4821"), or null
- account_type: one of Credit Card, Auto Loan, Mortgage, Student Loan, Personal Loan, Collection, Medical, Retail, Other
- balance: current balance as a number (dollars, no symbols), or null if not present
- status: one of Current, Late 30, Late 60, Late 90, Derogatory, Charge-off, Collection, Closed, Unknown
- negative_flag: true if account has any late payments, charge-offs, collections, or derogatory marks; false otherwise

Return this exact JSON structure:
{{
  "accounts": [
    {{
      "creditor_name": "string",
      "account_number": "4_digits_or_null",
      "account_type": "string",
      "balance": number_or_null,
      "status": "string",
      "negative_flag": boolean
    }}
  ]
}}

Credit report text:
{text}"""


ANALYSIS_SYSTEM = """You are a senior credit analyst and consumer credit strategy expert.
Generate a comprehensive, actionable credit audit with account-specific recommendations.
Return ONLY valid JSON. No explanation, no markdown, no extra text."""

ANALYSIS_USER = """Analyze this credit profile and generate a complete audit report.

Accounts on file (include the account "id" in recommendations that target a specific account):
{accounts_json}

Additional context:
- Negative accounts: {negative_count}
- Total accounts: {total_count}

Generate a risk assessment and at minimum 15 specific, actionable recommendations.
Risk score: 0 = excellent credit health, 100 = critical credit risk.

For each recommendation:
- severity: "high" (immediate action required), "medium" (address within 60 days), or "low" (long-term optimization)
- title: concise title under 60 characters
- description: 2-4 sentences of specific, actionable guidance referencing credit law where appropriate (FCRA, FDCPA, FCBA)
- account_id: the exact "id" value from the accounts list above if this recommendation targets a specific account, or null for general recommendations

Required coverage areas across your recommendations:
1. Any collection accounts (validation letters, statute of limitations)
2. Any charge-offs (pay-for-delete negotiations, accuracy review)
3. Any late payment patterns (goodwill adjustments, aging analysis)
4. Credit utilization (per-card and aggregate ratios)
5. Account age and credit history length
6. Credit mix optimization
7. Hard inquiry review and dispute opportunities
8. Potential FCRA violations (re-aging, duplicate reporting)
9. Dispute letter strategies for inaccurate information
10. Payment prioritization strategy

Return this exact JSON structure:
{{
  "risk_score": integer_0_to_100,
  "summary": {{
    "negative_accounts": integer,
    "total_accounts": integer,
    "collections": integer,
    "late_payments": integer,
    "charge_offs": integer
  }},
  "recommendations": [
    {{
      "severity": "high|medium|low",
      "title": "string",
      "description": "string",
      "account_id": "account_id_string_or_null"
    }}
  ]
}}"""
