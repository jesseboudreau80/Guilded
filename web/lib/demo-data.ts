// Shared demo data for all /preview routes.
// Represents a realistic user ~6 weeks into recovery — not perfect, not hopeless.

export const DEMO_STATS = {
  riskScore:     72,
  riskLabel:     "High Risk" as const,
  riskColor:     "orange" as const,
  targets:       9,
  xp:            300,
  rank:          "Journeyman",
  totalAccounts: 14,
  adverseItems:  6,
  collections:   2,
  latePayments:  4,
};

export const DEMO_JOURNEY = [
  { id: "account",   label: "Account activated",         xp: 25,  done: true  },
  { id: "audit",     label: "First credit audit",         xp: 100, done: true  },
  { id: "verified",  label: "Accounts verified",          xp: 50,  done: true  },
  { id: "results",   label: "Recovery plan activated",    xp: 75,  done: true  },
  { id: "module",    label: "Training started",           xp: 50,  done: true  },
  { id: "dispute",   label: "First dispute letter",       xp: 150, done: false },
  { id: "completed", label: "First module completed",     xp: 100, done: false },
];

export const DEMO_RECS = {
  high: [
    {
      title: "Validate Portfolio Recovery Associates debt",
      desc:  "Collector has not provided proof of ownership or right to collect. FDCPA §809(b) demands cease-and-desist until validation is provided.",
      law:   "FDCPA §809(b)",
    },
    {
      title: "Dispute Midland Funding charge-off — unverifiable balance",
      desc:  "Balance reported differs by $847 from original creditor records. FCRA §611 requires bureaus to investigate and remove if unverifiable.",
      law:   "FCRA §611",
    },
    {
      title: "Challenge Equifax re-aging — Capital One account",
      desc:  "Reported delinquency date suggests re-aging, extending the 7-year reporting window. Statutory violation under FCRA §605(a).",
      law:   "FCRA §605(a)",
    },
  ],
  medium: [
    {
      title: "Goodwill removal — Wells Fargo 30-day late",
      desc:  "Isolated late payment on an 8-year positive account. Strong goodwill removal candidate given consistent payment history.",
      law:   "Goodwill",
    },
    {
      title: "Dispute unknown hard inquiry — Experian",
      desc:  "Hard inquiry from unrecognized creditor. Request permissible purpose disclosure under FCRA §604.",
      law:   "FCRA §604",
    },
    {
      title: "Correct Medical Credit Services payment status",
      desc:  "Account shows Open despite being paid in full. Request status correction from original creditor.",
      law:   "FCRA §611",
    },
  ],
  low: [
    {
      title: "Reduce Capital One utilization (78%)",
      desc:  "High utilization is actively suppressing your score. Target under 30% for meaningful improvement.",
      law:   "Utilization",
    },
  ],
  locked: [
    {
      title: "Initiate formal arbitration — Midland Funding",
      desc:  "Arbitration demand under account agreement.",
    },
    {
      title: "JAMS consumer demand — Portfolio Recovery Associates",
      desc:  "Consumer arbitration escalation pathway.",
    },
  ],
};

export const DEMO_MODULES = [
  { n: "01", title: "Know Your Rights",                  badge: "Foundation",  done: true,  active: false, locked: false, mins: 25, progress: 100 },
  { n: "02", title: "Your Credit Report Decoded",        badge: "Tactical",    done: false, active: true,  locked: false, mins: 30, progress: 38  },
  { n: "03", title: "The Credit Score Machine",          badge: "Defensive",   done: false, active: false, locked: false, mins: 28, progress: 0   },
  { n: "04", title: "The Dispute Campaign",              badge: "Offensive",   done: false, active: false, locked: false, mins: 35, progress: 0   },
  { n: "05", title: "12-Month Recovery Blueprint",       badge: "Growth",      done: false, active: false, locked: true,  mins: 32, progress: 0   },
  { n: "06", title: "Advanced Monitoring & Protection",  badge: "Advanced",    done: false, active: false, locked: true,  mins: 29, progress: 0   },
  { n: "07", title: "Arbitration & Legal Escalation",    badge: "Elite",       done: false, active: false, locked: true,  mins: 40, progress: 0   },
];

export const BADGE_COLORS: Record<string, string> = {
  Foundation: "text-slate-300 border-slate-600",
  Tactical:   "text-blue-400 border-blue-500/30",
  Defensive:  "text-indigo-400 border-indigo-500/30",
  Offensive:  "text-red-400 border-red-500/30",
  Growth:     "text-emerald-400 border-emerald-500/30",
  Advanced:   "text-amber-400 border-amber-500/30",
  Elite:      "text-gold border-gold/30",
};

export const DEMO_BRIEFING =
  "You have 3 high-priority dispute targets ready to action. Your validation letter to Portfolio Recovery Associates is overdue — collectors are required to cease all collection activity once you send a written validation request under FDCPA §809(b). This is your highest-impact move this week.";
