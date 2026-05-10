"""
Guild Academy — canonical 7-module curriculum seed.

Slugs, tiers, and module numbers here must exactly match
the markdown files in web/public/academy-content/:

  01-understanding-credit-fundamentals.md   slug: understanding-credit-fundamentals
  02-preparing-for-battle.md                slug: preparing-for-battle
  03-building-your-arsenal.md               slug: building-your-arsenal
  04-the-attack-plan.md                     slug: the-attack-plan
  05-long-term-credit-restoration.md        slug: long-term-credit-restoration
  06-enrichment-and-support.md              slug: enrichment-and-support
  07-mastering-debt-arbitration.md          slug: mastering-debt-arbitration

If this list is changed, the service will detect the slug-set mismatch
on next startup and reseed the DB automatically.
"""

CURRICULUM: list[dict] = [
    {
        "slug":              "understanding-credit-fundamentals",
        "title":             "Understanding Credit Fundamentals",
        "description":       "Master the architecture of credit scoring, the rights every consumer holds under federal law, and the mindset required to take control of your financial future.",
        "curriculum_topic":  "credit_fundamentals",
        "tier_required":     "APPRENTICE",
        "order_index":       1,
        "estimated_minutes": 45,
        "badge_label":       "Foundation",
        "lessons": [
            {"title": "Anatomy of a Credit Score",                  "content_key": "credit-score-anatomy",    "is_preview": True},
            {"title": "The Three-Digit Number That Controls Access", "content_key": "three-digit-power",       "is_preview": False},
            {"title": "How the Bureaus Actually Work",              "content_key": "bureau-mechanics",         "is_preview": False},
            {"title": "Your Federal Rights Under FCRA",             "content_key": "fcra-rights",              "is_preview": False},
        ],
        "triggers": [
            {
                "trigger_key": "high_risk_score",
                "priority":    5,
                "rationale":   "Your risk score indicates foundational credit knowledge gaps worth closing first.",
            },
        ],
    },
    {
        "slug":              "preparing-for-battle",
        "title":             "Preparing for Battle",
        "description":       "Lay the groundwork for effective credit repair by pulling your reports, identifying errors, cleaning up personal information, and building your strategic battle plan.",
        "curriculum_topic":  "credit_fundamentals",
        "tier_required":     "APPRENTICE",
        "order_index":       2,
        "estimated_minutes": 30,
        "badge_label":       "Tactical",
        "lessons": [
            {"title": "Pulling All Three Credit Reports",    "content_key": "pulling-reports",      "is_preview": True},
            {"title": "Reading Your Report Like a Soldier",  "content_key": "reading-reports",      "is_preview": False},
            {"title": "Identifying Errors and Targets",      "content_key": "identifying-errors",   "is_preview": False},
            {"title": "Building Your Battle Map",            "content_key": "battle-map",           "is_preview": False},
        ],
        "triggers": [
            {
                "trigger_key": "has_negative_accounts",
                "priority":    8,
                "rationale":   "Negative accounts were found on your report — preparation is the first step to removing them.",
            },
            {
                "trigger_key": "high_risk_score",
                "priority":    4,
                "rationale":   "A high risk score means you need a clear battle plan before taking action.",
            },
        ],
    },
    {
        "slug":              "building-your-arsenal",
        "title":             "Building Your Arsenal",
        "description":       "Equip yourself with the tools, techniques, and strategies to rebuild and strengthen your credit — from budgeting and utilization to secured products and inquiry management.",
        "curriculum_topic":  "utilization",
        "tier_required":     "APPRENTICE",
        "order_index":       3,
        "estimated_minutes": 45,
        "badge_label":       "Defensive",
        "lessons": [
            {"title": "Credit Utilization Mastery",          "content_key": "utilization-mastery",   "is_preview": True},
            {"title": "Budgeting as a Credit Weapon",        "content_key": "budget-weapon",          "is_preview": False},
            {"title": "Secured Cards Done Right",            "content_key": "secured-cards-right",    "is_preview": False},
            {"title": "Managing Inquiries Strategically",    "content_key": "inquiry-management",     "is_preview": False},
        ],
        "triggers": [
            {
                "trigger_key": "high_utilization",
                "priority":    9,
                "rationale":   "High credit utilization detected — this module gives you the tools to fix it fast.",
            },
        ],
    },
    {
        "slug":              "the-attack-plan",
        "title":             "The Attack Plan",
        "description":       "Execute the active steps of credit repair — disputing negative items, exercising your FCRA and FDCPA rights, negotiating with collectors, and cleaning your report.",
        "curriculum_topic":  "disputes",
        "tier_required":     "APPRENTICE",
        "order_index":       4,
        "estimated_minutes": 60,
        "badge_label":       "Offensive",
        "lessons": [
            {"title": "The FCRA Dispute Process",            "content_key": "fcra-dispute-process",   "is_preview": True},
            {"title": "Writing Dispute Letters That Win",    "content_key": "dispute-letters",         "is_preview": False},
            {"title": "Collections Combat — FDCPA Rights",  "content_key": "collections-fdcpa",       "is_preview": False},
            {"title": "Charge-Off and Late Payment Tactics", "content_key": "charge-off-tactics",     "is_preview": False},
            {"title": "Tracking and Escalating Disputes",   "content_key": "dispute-escalation",      "is_preview": False},
        ],
        "triggers": [
            {
                "trigger_key": "has_collections",
                "priority":    10,
                "rationale":   "Collection accounts detected — this module gives you the exact playbook to fight them.",
            },
            {
                "trigger_key": "has_charge_offs",
                "priority":    9,
                "rationale":   "Charge-off accounts require active negotiation strategy — covered in depth here.",
            },
            {
                "trigger_key": "has_late_payments",
                "priority":    8,
                "rationale":   "Late payment history detected — dispute and goodwill tactics start in this module.",
            },
            {
                "trigger_key": "fcra_violation",
                "priority":    10,
                "rationale":   "Potential FCRA violations identified — this module covers your legal dispute rights.",
            },
        ],
    },
    {
        "slug":              "long-term-credit-restoration",
        "title":             "Long-Term Credit Restoration",
        "description":       "Build and maintain a strong credit profile after completing the repair process — establishing long-term health, preventing future setbacks, and using credit as a wealth tool.",
        "curriculum_topic":  "rebuilding",
        "tier_required":     "JOURNEYMAN",
        "order_index":       5,
        "estimated_minutes": 60,
        "badge_label":       "Growth",
        "lessons": [
            {"title": "The 12-Month Rebuild Timeline",       "content_key": "twelve-month-rebuild",    "is_preview": True},
            {"title": "Positive Trade Line Strategy",        "content_key": "positive-tradelines",     "is_preview": False},
            {"title": "Protecting Your Score Long-Term",     "content_key": "score-protection",        "is_preview": False},
            {"title": "Using Credit to Build Wealth",        "content_key": "credit-wealth-building",  "is_preview": False},
        ],
        "triggers": [
            {
                "trigger_key": "rebuild_credit",
                "priority":    7,
                "rationale":   "Your risk profile calls for active credit rebuilding — this module provides the roadmap.",
            },
            {
                "trigger_key": "critical_risk_score",
                "priority":    8,
                "rationale":   "A critical risk score requires a systematic long-term restoration plan.",
            },
        ],
    },
    {
        "slug":              "enrichment-and-support",
        "title":             "Enrichment & Support",
        "description":       "Advanced tools, interactive resources, and community support to sustain and enhance your credit journey — including ongoing education and exclusive Guild resources.",
        "curriculum_topic":  "long_term_health",
        "tier_required":     "JOURNEYMAN",
        "order_index":       6,
        "estimated_minutes": 45,
        "badge_label":       "Advanced",
        "lessons": [
            {"title": "Advanced Dispute Templates",          "content_key": "advanced-templates",      "is_preview": True},
            {"title": "Credit Monitoring Systems",           "content_key": "credit-monitoring",       "is_preview": False},
            {"title": "Identity Protection Protocol",        "content_key": "identity-protection",     "is_preview": False},
            {"title": "Guild Resources and Community",       "content_key": "guild-resources",         "is_preview": False},
        ],
        "triggers": [
            {
                "trigger_key": "rebuild_credit",
                "priority":    6,
                "rationale":   "Sustained recovery requires ongoing education and the right tools.",
            },
            {
                "trigger_key": "identity_risk",
                "priority":    10,
                "rationale":   "Identity risk indicators found — this module covers protection protocol.",
            },
        ],
    },
    {
        "slug":              "mastering-debt-arbitration",
        "title":             "Mastering Debt Arbitration",
        "description":       "Advanced Guild strategy for members ready to use legal leverage against creditors — from pre-dispute preparation to JAMS/AAA filing and settlement negotiation.",
        "curriculum_topic":  "arbitration",
        "tier_required":     "MASTER",
        "order_index":       7,
        "estimated_minutes": 90,
        "badge_label":       "Elite",
        "lessons": [
            {"title": "How Consumer Arbitration Works",      "content_key": "arbitration-intro",       "is_preview": True},
            {"title": "Reading Creditor Arbitration Clauses", "content_key": "arbitration-clauses",    "is_preview": False},
            {"title": "Filing with JAMS and AAA",            "content_key": "jams-aaa-filing",         "is_preview": False},
            {"title": "Pre-Dispute Demand Strategy",         "content_key": "predispute-demand",       "is_preview": False},
            {"title": "Settlement Negotiation",              "content_key": "arbitration-settlement",  "is_preview": False},
        ],
        "triggers": [
            {
                "trigger_key": "arbitration_candidate",
                "priority":    10,
                "rationale":   "Your audit findings suggest arbitration may be the most powerful tool available to you.",
            },
        ],
    },
]
