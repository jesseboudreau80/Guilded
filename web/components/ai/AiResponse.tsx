type Props = { text: string };

function renderParagraph(para: string, idx: number) {
  const lines = para.split("\n").filter((l) => l.trim() !== "");

  // Pure numbered-list paragraph (all lines start with "N.")
  if (lines.length >= 2 && lines.every((l) => /^\d+\./.test(l.trim()))) {
    return (
      <ol key={idx} className="list-none space-y-2">
        {lines.map((line, j) => {
          const m = line.match(/^(\d+)\.\s*(.+)/);
          if (!m) return <li key={j} className="text-slate-200">{line}</li>;
          return (
            <li key={j} className="flex gap-3">
              <span className="shrink-0 font-medium text-gold">{m[1]}.</span>
              <span className="text-slate-200">{m[2]}</span>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <p key={idx} className="whitespace-pre-line text-slate-200">
      {para}
    </p>
  );
}

export function AiResponse({ text }: Props) {
  const paragraphs = text.split(/\n\n+/);

  return (
    <div className="space-y-4 text-sm leading-relaxed">
      {paragraphs.map((para, i) => renderParagraph(para, i))}
    </div>
  );
}
