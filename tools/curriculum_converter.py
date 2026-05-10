#!/usr/bin/env python3
"""
Guild Academy Curriculum Converter
===================================
Converts a DOCX or TXT curriculum document into structured markdown modules
ready for the Academy engine at web/public/academy-content/.

Usage
-----
  # From a DOCX file
  python tools/curriculum_converter.py --input curriculum.docx

  # From a TXT file, writing JSON intermediate too
  python tools/curriculum_converter.py --input curriculum.txt --json

  # Custom output directory, dry-run preview
  python tools/curriculum_converter.py --input curriculum.docx \\
      --out web/public/academy-content --dry-run

  # Verbose mode (prints detected structure)
  python tools/curriculum_converter.py --input curriculum.txt --verbose

Dependencies
------------
  python-docx (DOCX only): pip install python-docx
  Everything else uses the Python standard library.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import textwrap
from dataclasses import asdict, dataclass, field
from pathlib import Path

# ── Optional python-docx ──────────────────────────────────────────────────────

try:
    from docx import Document as _DocxDocument  # type: ignore
    from docx.oxml.ns import qn as _qn          # type: ignore
    HAS_DOCX = True
except ImportError:
    HAS_DOCX = False


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Data model
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class RawParagraph:
    """A single paragraph extracted from the source document."""
    text:       str
    style:      str   = "Normal"   # DOCX style name; "Normal" for TXT
    is_bold:    bool  = False
    is_italic:  bool  = False
    indent:     int   = 0          # number of indent levels (DOCX) or leading spaces/4 (TXT)


@dataclass
class Block:
    """A processed content block within a lesson."""
    kind:    str        # paragraph | heading | bullet_list | callout | divider
    text:    str  = "" # for paragraph / heading / callout
    level:   int  = 3  # heading level (2 or 3)
    items:   list[str] = field(default_factory=list)  # for bullet_list


@dataclass
class Lesson:
    """A lesson (sub-section) within a module."""
    number: str          # "1.1", "2.3", "" if unnumbered
    title:  str
    blocks: list[Block]  = field(default_factory=list)


@dataclass
class Module:
    """A top-level curriculum module."""
    number:       int
    title:        str
    slug:         str
    tier:         str   = "APPRENTICE"
    minutes:      int   = 45
    badge:        str   = "Foundation"
    intro_blocks: list[Block]  = field(default_factory=list)
    lessons:      list[Lesson] = field(default_factory=list)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Module metadata table — edit these to match your curriculum
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODULE_META: dict[int, dict] = {
    1: {"tier": "APPRENTICE", "minutes": 45, "badge": "Foundation",
        "slug": "understanding-credit-fundamentals"},
    2: {"tier": "APPRENTICE", "minutes": 30, "badge": "Tactical",
        "slug": "preparing-for-battle"},
    3: {"tier": "APPRENTICE", "minutes": 45, "badge": "Defensive",
        "slug": "building-your-arsenal"},
    4: {"tier": "APPRENTICE", "minutes": 60, "badge": "Offensive",
        "slug": "the-attack-plan"},
    5: {"tier": "JOURNEYMAN", "minutes": 60, "badge": "Growth",
        "slug": "long-term-credit-restoration"},
    6: {"tier": "JOURNEYMAN", "minutes": 45, "badge": "Advanced",
        "slug": "enrichment-and-support"},
    7: {"tier": "MASTER",     "minutes": 90, "badge": "Elite",
        "slug": "mastering-debt-arbitration"},
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Text normalization
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_UNICODE_MAP = str.maketrans({
    "‘": "'",   # left single quote
    "’": "'",   # right single quote
    "“": '"',   # left double quote
    "”": '"',   # right double quote
    "–": "--",  # en dash
    "—": "--",  # em dash
    "•": "-",   # bullet •
    "‣": "-",   # triangle bullet
    "◦": "-",   # white bullet
    "⁃": "-",   # hyphen bullet
    "·": "-",   # middle dot
    " ": " ",   # non-breaking space
    "…": "...", # ellipsis
})

def normalize(text: str) -> str:
    return text.translate(_UNICODE_MAP).strip()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Document readers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def read_docx(path: Path, verbose: bool = False) -> list[RawParagraph]:
    """Extract paragraphs from a DOCX file preserving style and bold information."""
    if not HAS_DOCX:
        sys.exit(
            "ERROR: python-docx is required to read DOCX files.\n"
            "Install it with:  pip install python-docx\n"
            "Or convert your file to TXT and use --input curriculum.txt"
        )

    doc = _DocxDocument(str(path))
    paragraphs: list[RawParagraph] = []

    for para in doc.paragraphs:
        text = normalize(para.text)
        if not text:
            continue

        style = para.style.name if para.style else "Normal"

        # Detect bold: paragraph is "bold" if all non-whitespace runs are bold
        runs_with_text = [r for r in para.runs if r.text.strip()]
        is_bold = bool(runs_with_text) and all(r.bold for r in runs_with_text)

        # Detect italic
        is_italic = bool(runs_with_text) and all(r.italic for r in runs_with_text)

        # Paragraph indent (number of indent stops)
        indent = 0
        try:
            pf = para._p.pPr
            if pf is not None:
                ind = pf.find(_qn("w:ind"))
                if ind is not None:
                    left = int(ind.get(_qn("w:left"), 0) or 0)
                    indent = left // 720  # 720 twips = 0.5 inch
        except Exception:
            pass

        raw = RawParagraph(
            text=text, style=style,
            is_bold=is_bold, is_italic=is_italic, indent=indent,
        )
        paragraphs.append(raw)
        if verbose:
            print(f"  [{style}] bold={is_bold} indent={indent}: {text[:60]}")

    return paragraphs


def read_txt(path: Path, verbose: bool = False) -> list[RawParagraph]:
    """Parse a plain-text curriculum file into RawParagraphs."""
    content = path.read_text(encoding="utf-8", errors="replace")
    lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")

    paragraphs: list[RawParagraph] = []
    for raw_line in lines:
        text = normalize(raw_line)
        if not text:
            continue

        # Count leading spaces for indent heuristic
        leading = len(raw_line) - len(raw_line.lstrip())
        indent = leading // 4

        raw = RawParagraph(text=text, indent=indent)
        paragraphs.append(raw)
        if verbose:
            print(f"  [TXT] indent={indent}: {text[:60]}")

    return paragraphs


def read_document(path: Path, verbose: bool = False) -> list[RawParagraph]:
    suffix = path.suffix.lower()
    if suffix == ".docx":
        return read_docx(path, verbose=verbose)
    elif suffix in (".txt", ".text", ".md"):
        return read_txt(path, verbose=verbose)
    else:
        sys.exit(f"ERROR: Unsupported file type '{suffix}'. Use .docx or .txt")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pattern detection
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Module header patterns — ordered by specificity
_MODULE_PATTERNS = [
    # "MODULE 1: Title" / "MODULE 1 - Title" / "MODULE 1 Title"
    re.compile(r"^MODULE\s+(\d+)\s*[:\-–—]\s*(.+)$", re.IGNORECASE),
    # "CHAPTER 1: Title" / "UNIT 1: Title"
    re.compile(r"^(?:CHAPTER|UNIT|PART)\s+(\d+)\s*[:\-–—]\s*(.+)$", re.IGNORECASE),
    # "1. ALL CAPS TITLE" or "1. Title Case Title"
    re.compile(r"^(\d+)\.\s+([A-Z][A-Z\s\-–—:]{4,})$"),
    # Roman numeral: "I. TITLE" / "II. TITLE"
    re.compile(r"^(I{1,3}|IV|VI{0,3}|IX|X)\.\s+(.+)$"),
]

# Lesson/sub-section patterns
_LESSON_PATTERNS = [
    # "1.1 Title" / "1.1: Title" / "1.1 - Title"
    re.compile(r"^(\d+)\.(\d+)\s*[:\-–—]?\s*(.+)$"),
    # "Lesson 1: Title" / "Lesson 1.1: Title"
    re.compile(r"^Lesson\s+(\d+\.?\d*)\s*[:\-–—]\s*(.+)$", re.IGNORECASE),
    # "Section A: Title" / "Part A: Title"
    re.compile(r"^(?:Section|Part)\s+([A-Za-z\d\.]+)\s*[:\-–—]\s*(.+)$", re.IGNORECASE),
    # "A. Title" (lettered sub-sections)
    re.compile(r"^([A-Z])\.\s+([A-Z].+)$"),
]

# Bullet point patterns
_BULLET_RE = re.compile(r"^[-•–—*]\s+(.+)$")
_NUMBERED_LIST_RE = re.compile(r"^\d+[\.\)]\s+(.+)$")

# Callout / note patterns — only single-word sentinel keywords followed by colon
_CALLOUT_RE = re.compile(r"^(NOTE|TIP|IMPORTANT|WARNING|REMEMBER)\s*[:\-–]\s*(.+)$", re.IGNORECASE)

# Section heading within a lesson (bold paragraph or ends with colon)
_SECTION_HEADING_RE = re.compile(r"^([A-Z][A-Za-z\s\-]+):$")


def _roman_to_int(r: str) -> int:
    vals = {"I": 1, "V": 5, "X": 10}
    total = 0
    prev = 0
    for ch in reversed(r.upper()):
        v = vals.get(ch, 0)
        if v < prev:
            total -= v
        else:
            total += v
        prev = v
    return total


def detect_module(para: RawParagraph) -> tuple[int, str] | None:
    """
    Returns (module_number, title) if paragraph is a module header, else None.
    Combines style-based (DOCX) and pattern-based detection.
    """
    text = para.text

    # DOCX style-based: Heading 1, Title, Outline Level 1
    if any(s in para.style for s in ("Heading 1", "Title", "Heading1", "heading 1")):
        # Try to extract number from the title itself
        for pat in _MODULE_PATTERNS:
            m = pat.match(text)
            if m:
                num_str = m.group(1)
                title   = m.group(2).strip()
                n = _roman_to_int(num_str) if num_str[0].isalpha() else int(num_str)
                return n, title
        # Heading 1 without a number → assign sequentially (handled by parser)
        return -1, text

    # Pattern-based for TXT / un-styled DOCX
    for i, pat in enumerate(_MODULE_PATTERNS):
        m = pat.match(text)
        if m:
            num_str = m.group(1)
            title   = m.group(2).strip()
            n = _roman_to_int(num_str) if (i == 3 or not num_str[0].isdigit()) else int(num_str)
            return n, title

    return None


def detect_lesson(para: RawParagraph) -> tuple[str, str] | None:
    """
    Returns (lesson_number, title) if paragraph is a lesson header, else None.
    """
    text = para.text

    # DOCX Heading 2 → lesson level
    if any(s in para.style for s in ("Heading 2", "Heading2", "heading 2")):
        for pat in _LESSON_PATTERNS:
            m = pat.match(text)
            if m:
                if pat == _LESSON_PATTERNS[0]:  # "1.1 Title"
                    return f"{m.group(1)}.{m.group(2)}", m.group(3).strip()
                return m.group(1), m.group(len(m.groups())).strip()
        return "", text  # unnumbered lesson from Heading 2

    # Pattern-based
    for pat in _LESSON_PATTERNS:
        m = pat.match(text)
        if m:
            if pat == _LESSON_PATTERNS[0]:  # "1.1 Title"
                return f"{m.group(1)}.{m.group(2)}", m.group(3).strip()
            return m.group(1), m.group(len(m.groups())).strip()

    return None


def detect_block_kind(para: RawParagraph) -> str:
    """Classify a paragraph into its block kind."""
    text = para.text
    style = para.style

    # DOCX list styles
    if "List" in style or "Bullet" in style:
        return "bullet"

    # Bullet markers
    if _BULLET_RE.match(text) or _NUMBERED_LIST_RE.match(text):
        return "bullet"

    # Callout / note
    if _CALLOUT_RE.match(text):
        return "callout"

    # Divider
    if re.match(r"^[-=_]{3,}$", text):
        return "divider"

    # Section heading within a lesson
    if (para.is_bold and len(text) < 80) or _SECTION_HEADING_RE.match(text):
        if any(s in style for s in ("Heading 3", "Heading3")):
            return "heading3"
        return "heading3"

    return "paragraph"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Outline / expansion boundary detection
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def find_expansion_start(paragraphs: list[RawParagraph]) -> int:
    """
    Locate where the expanded curriculum begins, skipping any outline/TOC.

    Documents often contain:
      (1) A short outline listing module/lesson titles (no body content)
      (2) The full expanded curriculum with actual lesson text

    Both sections use identical module headers, so the same module number
    appears TWICE. We find the second occurrence of the lowest-numbered
    duplicate — that is the start of the real content.

    Returns the paragraph index to start parsing from.
    Returns 0 if no duplication is detected (safe: parse everything).
    """
    # First pass: record every paragraph index where a module header is found
    module_positions: dict[int, list[int]] = {}
    for i, para in enumerate(paragraphs):
        result = detect_module(para)
        if result is not None:
            num, _ = result
            if num > 0:
                module_positions.setdefault(num, []).append(i)

    total_candidates = sum(len(v) for v in module_positions.values())
    unique_nums      = len(module_positions)

    print(f"  [stage 1] {total_candidates} module header(s) across {unique_nums} unique number(s)")

    # Look for any module that appears more than once; prefer the lowest number
    for mod_num in sorted(module_positions.keys()):
        positions = module_positions[mod_num]
        if len(positions) >= 2:
            start_idx     = positions[1]
            outline_paras = start_idx
            print(f"  [stage 1] Module {mod_num} at paragraphs {positions[:4]}")
            print(f"  [stage 1] OUTLINE section: {outline_paras} paragraph(s) → SKIPPED")
            print(f"  [stage 1] Expanded curriculum starts at paragraph {start_idx}")
            return start_idx

    print("  [stage 1] No outline/expansion boundary — parsing full document")
    return 0


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Parser — assembles Module / Lesson / Block tree
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _extract_bullet_text(text: str) -> str:
    m = _BULLET_RE.match(text) or _NUMBERED_LIST_RE.match(text)
    return m.group(1).strip() if m else text


def _make_block(para: RawParagraph, kind: str) -> Block:
    text = para.text
    if kind == "bullet":
        return Block(kind="bullet_list", items=[_extract_bullet_text(text)])
    if kind in ("heading3", "heading2"):
        level = 3 if kind == "heading3" else 2
        # Strip trailing colon from heading text
        clean = text.rstrip(":")
        return Block(kind="heading", level=level, text=clean)
    if kind == "callout":
        m = _CALLOUT_RE.match(text)
        body = m.group(2) if m else text  # group 2 = content after keyword
        return Block(kind="callout", text=body)
    if kind == "divider":
        return Block(kind="divider")
    return Block(kind="paragraph", text=text)


def _append_block(target: list[Block], block: Block) -> None:
    """Merge consecutive bullet_list blocks into one."""
    if block.kind == "bullet_list" and target and target[-1].kind == "bullet_list":
        target[-1].items.extend(block.items)
    else:
        target.append(block)


def parse_curriculum(
    paragraphs: list[RawParagraph],
    verbose: bool = False,
) -> list[Module]:
    # ── Stage 1: skip outline/TOC ─────────────────────────────────────────
    print("\n[stage 1] Scanning for outline/expansion boundary…")
    start_idx = find_expansion_start(paragraphs)
    if start_idx > 0:
        paragraphs = paragraphs[start_idx:]

    # ── Stage 2: parse expanded curriculum ───────────────────────────────
    print(f"\n[stage 2] Parsing {len(paragraphs)} paragraph(s)…")

    modules:        list[Module] = []
    cur_module:     Module  | None = None
    cur_lesson:     Lesson  | None = None
    auto_module_num = 0
    auto_lesson_seq = 0
    seen_nums:      set[int] = set()   # guard against any remaining duplicates
    seen_slugs:     set[str] = set()

    def flush_lesson() -> None:
        nonlocal cur_lesson
        if cur_lesson is not None and cur_module is not None:
            cur_module.lessons.append(cur_lesson)
        cur_lesson = None

    def flush_module() -> None:
        nonlocal cur_module
        flush_lesson()
        if cur_module is not None:
            modules.append(cur_module)
        cur_module = None

    for para in paragraphs:
        text = para.text

        # ── Module header? ─────────────────────────────────────────────────
        mod_result = detect_module(para)
        if mod_result is not None:
            num, title = mod_result
            if num == -1:
                auto_module_num += 1
                num = auto_module_num
            else:
                auto_module_num = num

            # Duplicate guard — any module already seen belongs to a nested
            # outline or repeated section; skip it entirely.
            if num in seen_nums:
                if verbose:
                    print(f"  [stage 2] DUPLICATE module {num} skipped: {title!r}")
                continue
            seen_nums.add(num)

            flush_module()

            meta = MODULE_META.get(num, {})
            slug = meta.get("slug") or _title_to_slug(title)

            # Slug dedup safety net (shouldn't trigger if meta is correct)
            if slug in seen_slugs:
                slug = f"{slug}-{num}"
            seen_slugs.add(slug)

            cur_module = Module(
                number  = num,
                title   = title,
                slug    = slug,
                tier    = meta.get("tier",    "APPRENTICE"),
                minutes = meta.get("minutes", 45),
                badge   = meta.get("badge",   "Foundation"),
            )
            auto_lesson_seq = 0
            print(f"  [stage 2] MODULE {num}: {title!r}")
            continue

        # ── Lesson header? ─────────────────────────────────────────────────
        les_result = detect_lesson(para)
        if les_result is not None and cur_module is not None:
            flush_lesson()
            les_num, les_title = les_result
            if not les_num:
                auto_lesson_seq += 1
                les_num = f"{cur_module.number}.{auto_lesson_seq}"
            cur_lesson = Lesson(number=les_num, title=les_title)
            if verbose:
                print(f"    LESSON {les_num}: {les_title!r}")
            continue

        # ── Content block ──────────────────────────────────────────────────
        if cur_module is None:
            # Preface / preamble before Module 1 — skip silently
            continue

        kind  = detect_block_kind(para)
        block = _make_block(para, kind)

        target: list[Block] = cur_lesson.blocks if cur_lesson else cur_module.intro_blocks
        _append_block(target, block)

    flush_module()
    return modules


def _title_to_slug(title: str) -> str:
    slug = title.lower()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-+", "-", slug)
    return slug[:60]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Markdown generator
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _render_block(block: Block) -> str:
    if block.kind == "paragraph":
        return block.text + "\n"
    if block.kind == "heading":
        hashes = "#" * block.level
        return f"{hashes} {block.text}\n"
    if block.kind == "bullet_list":
        lines = [f"- {item}" for item in block.items]
        return "\n".join(lines) + "\n"
    if block.kind == "callout":
        return f"> {block.text}\n"
    if block.kind == "divider":
        return "---\n"
    return ""


def _render_blocks(blocks: list[Block]) -> str:
    parts = []
    for block in blocks:
        rendered = _render_block(block)
        if rendered.strip():
            parts.append(rendered.rstrip())
    return "\n\n".join(parts)


def _render_lesson(lesson: Lesson) -> str:
    header = f"## Lesson {lesson.number}: {lesson.title}" if lesson.number else f"## {lesson.title}"
    body = _render_blocks(lesson.blocks)
    if body:
        return f"{header}\n\n{body}"
    return header


def generate_markdown(module: Module) -> str:
    lines: list[str] = []

    # YAML frontmatter
    lines.append("---")
    lines.append(f"title: {module.title}")
    lines.append(f"slug: {module.slug}")
    lines.append(f"module_number: {module.number}")
    lines.append(f"tier_required: {module.tier}")
    lines.append(f"estimated_minutes: {module.minutes}")
    lines.append(f"badge: {module.badge}")
    lines.append("---")
    lines.append("")

    # Module intro content (before any lesson)
    if module.intro_blocks:
        intro = _render_blocks(module.intro_blocks)
        if intro.strip():
            lines.append(intro)
            lines.append("")

    # Lessons
    for lesson in module.lessons:
        lines.append(_render_lesson(lesson))
        lines.append("")

    return "\n".join(lines).strip() + "\n"


def _output_filename(module: Module) -> str:
    return f"{module.number:02d}-{module.slug}.md"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Intermediate JSON serialization
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _module_to_dict(module: Module) -> dict:
    return {
        "number":  module.number,
        "title":   module.title,
        "slug":    module.slug,
        "meta": {
            "tier":    module.tier,
            "minutes": module.minutes,
            "badge":   module.badge,
        },
        "intro_blocks": [asdict(b) for b in module.intro_blocks],
        "lessons": [
            {
                "number": les.number,
                "title":  les.title,
                "blocks": [asdict(b) for b in les.blocks],
            }
            for les in module.lessons
        ],
    }


def save_json(modules: list[Module], path: Path) -> None:
    data = {"modules": [_module_to_dict(m) for m in modules]}
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  JSON intermediate: {path}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Diagnostics
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def print_structure(modules: list[Module]) -> None:
    print("\nDetected structure:")
    for mod in modules:
        blocks_count = len(mod.intro_blocks)
        print(f"  MODULE {mod.number}: {mod.title!r}  [{mod.slug}]")
        if mod.intro_blocks:
            print(f"    intro: {blocks_count} block(s)")
        for les in mod.lessons:
            bc = len(les.blocks)
            print(f"    LESSON {les.number}: {les.title!r}  ({bc} block(s))")


def print_stats(modules: list[Module]) -> None:
    total_lessons = sum(len(m.lessons) for m in modules)
    total_blocks  = sum(
        len(m.intro_blocks) + sum(len(l.blocks) for l in m.lessons)
        for m in modules
    )
    print(f"\nStats: {len(modules)} modules · {total_lessons} lessons · {total_blocks} blocks")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# CLI
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="Convert Guild curriculum DOCX/TXT into Academy markdown modules.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=textwrap.dedent("""\
            Examples:
              python tools/curriculum_converter.py --input curriculum.docx
              python tools/curriculum_converter.py --input curriculum.txt --json
              python tools/curriculum_converter.py --input curriculum.docx \\
                  --out web/public/academy-content --dry-run --verbose
        """),
    )
    parser.add_argument(
        "--input", "-i", required=True, metavar="FILE",
        help="Source file (.docx or .txt)",
    )
    parser.add_argument(
        "--out", "-o", default="web/public/academy-content",
        metavar="DIR",
        help="Output directory for .md files (default: web/public/academy-content)",
    )
    parser.add_argument(
        "--json", "-j", action="store_true",
        help="Also save an intermediate curriculum_intermediate.json file",
    )
    parser.add_argument(
        "--json-path", default="curriculum_intermediate.json", metavar="FILE",
        help="Path for JSON intermediate (default: curriculum_intermediate.json)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Parse and preview without writing any files",
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true",
        help="Print every paragraph as it is read",
    )
    args = parser.parse_args(argv)

    input_path = Path(args.input)
    if not input_path.exists():
        sys.exit(f"ERROR: Input file not found: {input_path}")

    print(f"Reading: {input_path}")
    paragraphs = read_document(input_path, verbose=args.verbose)
    print(f"  {len(paragraphs)} paragraphs extracted")

    print("\nParsing curriculum structure…")
    modules = parse_curriculum(paragraphs, verbose=args.verbose)

    if not modules:
        print("\nWARNING: No modules detected.")
        print("Check that your document uses recognizable module headers.")
        print("See the --verbose flag for paragraph-level debug output.")
        sys.exit(1)

    print_structure(modules)
    print_stats(modules)

    if args.dry_run:
        print("\nDry run — no files written.")
        return

    # Save JSON intermediate
    if args.json:
        save_json(modules, Path(args.json_path))

    # Write markdown files
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\nWriting markdown to: {out_dir}/")
    for module in modules:
        filename = _output_filename(module)
        content  = generate_markdown(module)
        dest     = out_dir / filename
        dest.write_text(content, encoding="utf-8")
        lesson_count = len(module.lessons)
        print(f"  {filename}  ({lesson_count} lessons)")

    print(f"\nDone. {len(modules)} modules written to {out_dir}/")
    print("\nNext step: rebuild your app to pick up the new markdown files.")
    print("  cd web && npm run build")


if __name__ == "__main__":
    main()
