STRATEGY_LABELS = {
    "validation":     "FDCPA Debt Validation",
    "goodwill":       "Goodwill Adjustment",
    "fcra_dispute":   "FCRA Inaccuracy Dispute",
    "pay_for_delete": "Pay-for-Delete Negotiation",
}

DISPUTE_SYSTEM = """You are a consumer credit attorney specializing in FCRA, FDCPA, and FCBA disputes.
Write professional, legally-grounded dispute letters on behalf of consumers.
Format as a real letter with date, subject line, body paragraphs, and closing.
Reference specific law sections (e.g. FCRA §611, FDCPA §809(b)) where applicable.
Use [YOUR MAILING ADDRESS] only for the return address — fill everything else with real content.
Do not write placeholder body text. Write the complete, ready-to-send letter."""


def build_dispute_user(
    recs_text: str,
    strategy: str,
    user_name: str,
    today: str,
) -> str:
    label = STRATEGY_LABELS.get(strategy, strategy.replace("_", " ").title())
    return f"""Write a {label} letter for this consumer.

Consumer name: {user_name}
Date: {today}

Issues identified on this credit report (from audit analysis):
{recs_text}

Strategy: {label}

Guidelines by strategy:
- validation: Demand the debt collector validate the debt under FDCPA §809(b). Request original creditor name, account agreement, payment history, and proof of authority to collect.
- goodwill: Politely request the creditor remove negative marks as a goodwill gesture, citing the consumer's otherwise positive history and financial goals.
- fcra_dispute: Formally dispute each inaccuracy under FCRA §611. State what is inaccurate for each issue and demand investigation and correction within 30 days.
- pay_for_delete: Propose a pay-for-delete arrangement for each derogatory account — offer payment in exchange for removal from all three bureaus.

Write one complete letter addressing all listed issues. Write the complete letter now."""
