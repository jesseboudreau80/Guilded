/**
 * Zero-dependency markdown parser for Academy content.
 *
 * Handles the specific formatting used in /public/academy-content/*.md:
 *   ## Heading 2      → section heading
 *   ### Heading 3     → sub-heading
 *   **bold**          → strong (inline)
 *   `code`            → inline code
 *   - item            → list item (consecutive lines form a list)
 *   > text            → callout blockquote
 *   ---               → visual divider
 *   blank line        → paragraph break
 *
 * Frontmatter (YAML-lite between --- delimiters) is parsed separately.
 */

export type FrontMatter = {
  title?:             string;
  badge?:             string;
  estimated_minutes?: string;
  tier_required?:     string;
  next_module?:       string;
  [key: string]: string | undefined;
};

export type Block =
  | { kind: "h2";       text: string }
  | { kind: "h3";       text: string }
  | { kind: "p";        html: string }
  | { kind: "list";     items: string[] }
  | { kind: "callout";  html: string }
  | { kind: "divider" };

export type ParsedModule = {
  frontmatter: FrontMatter;
  blocks:      Block[];
};

// ── Inline formatting ─────────────────────────────────────────────────────────

function inlineHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>");
}

// ── Frontmatter parser ────────────────────────────────────────────────────────

function parseFrontmatter(raw: string): { fm: FrontMatter; rest: string } {
  if (!raw.startsWith("---")) return { fm: {}, rest: raw };
  const close = raw.indexOf("\n---", 3);
  if (close === -1) return { fm: {}, rest: raw };

  const fm: FrontMatter = {};
  for (const line of raw.slice(4, close).split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) fm[key] = val;
  }

  return { fm, rest: raw.slice(close + 4).trim() };
}

// ── Block parser ──────────────────────────────────────────────────────────────

export function parseMarkdown(raw: string): ParsedModule {
  const { fm, rest } = parseFrontmatter(raw);
  const lines  = rest.split("\n");
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // H2
    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
      i++;
      continue;
    }

    // Divider
    if (line.trim() === "---") {
      blocks.push({ kind: "divider" });
      i++;
      continue;
    }

    // Callout (blockquote)
    if (line.startsWith("> ")) {
      blocks.push({ kind: "callout", html: inlineHtml(line.slice(2).trim()) });
      i++;
      continue;
    }

    // List block — consume consecutive list lines
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(inlineHtml(lines[i].slice(2).trim()));
        i++;
      }
      blocks.push({ kind: "list", items });
      continue;
    }

    // Blank line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph — accumulate until blank line
    const parts: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].startsWith("#") && !lines[i].startsWith("- ") && !lines[i].startsWith("> ") && lines[i].trim() !== "---") {
      parts.push(lines[i]);
      i++;
    }
    if (parts.length) {
      blocks.push({ kind: "p", html: inlineHtml(parts.join(" ")) });
    }
  }

  return { frontmatter: fm, blocks };
}
