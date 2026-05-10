"use client";

const CHIPS = [
  "Generate a dispute letter for a collection account",
  "Create a debt validation letter",
  "Explain a charge-off timeline",
  "Build a 580 score improvement plan",
  "Draft a goodwill adjustment letter",
  "Review this credit summary",
] as const;

export function PromptChips({ onSelect }: { onSelect: (text: string) => void }) {
  return (
    <div>
      <p className="mb-3 text-xs font-medium tracking-wide text-slate-400">
        Begin With Structured Guidance
      </p>
      <div className="flex flex-wrap gap-2">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onSelect(chip)}
            className="rounded-full border border-gold/40 px-3 py-1 text-xs text-slate-300 transition-colors hover:bg-gold/10 hover:text-slate-200"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
