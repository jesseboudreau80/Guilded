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


_CONTEXT_FLAG_LABELS: dict[str, str] = {
    "already_paid":   "Account has already been paid in full",
    "identity_theft": "Account is the result of identity theft — not the consumer's debt",
    "wrong_person":   "Collector has contacted the wrong person",
    "ocr_error":      "Extracted account data may contain OCR errors — verify details",
    "harassment":     "Collector has engaged in harassing contact",
    "medical":        "Debt arose from a medical hardship",
    "military":       "Consumer has military / SCRA status",
    "bankruptcy":     "Bankruptcy proceedings are or have been involved",
}


_BUREAU_LABELS: dict[str, str] = {
    "experian":   "Experian",
    "equifax":    "Equifax",
    "transunion": "TransUnion",
    "creditor":   "the original creditor",
    "collector":  "the debt collector",
}


def build_dispute_user(
    recs_text:      str,
    strategy:       str,
    user_name:      str,
    today:          str,
    context_flags:  list[str] | None = None,
    context_notes:  str | None = None,
    bureau_targets: list[str] | None = None,
) -> str:
    label = STRATEGY_LABELS.get(strategy, strategy.replace("_", " ").title())

    # Build optional context block — only included when user provides it
    context_lines: list[str] = []
    for flag in (context_flags or []):
        description = _CONTEXT_FLAG_LABELS.get(flag)
        if description:
            context_lines.append(f"- {description}")
    if context_notes and context_notes.strip():
        context_lines.append(f"- Additional context: {context_notes.strip()}")

    context_section = ""
    if context_lines:
        context_section = (
            "\nImportant consumer-provided context (incorporate into the letter):\n"
            + "\n".join(context_lines)
            + "\n"
        )

    # Bureau targeting section
    targets = bureau_targets or ["experian", "equifax", "transunion"]
    target_names = [_BUREAU_LABELS.get(t, t.title()) for t in targets]
    target_section = f"Addressed to: {', '.join(target_names)}\n" if target_names else ""

    return f"""Write a {label} letter for this consumer.

Consumer name: {user_name}
Date: {today}
{target_section}

Issues identified on this credit report (from audit analysis):
{recs_text}
{context_section}
Strategy: {label}

Guidelines by strategy:
- validation: Demand the debt collector validate the debt under FDCPA §809(b). Request original creditor name, account agreement, payment history, and proof of authority to collect.
- goodwill: Politely request the creditor remove negative marks as a goodwill gesture, citing the consumer's otherwise positive history and financial goals.
- fcra_dispute: Formally dispute each inaccuracy under FCRA §611. State what is inaccurate for each issue and demand investigation and correction within 30 days.
- pay_for_delete: Propose a pay-for-delete arrangement for each derogatory account — offer payment in exchange for removal from all three bureaus.

Write one complete letter addressing all listed issues. Write the complete letter now."""
