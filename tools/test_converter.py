#!/usr/bin/env python3
"""
Quick self-test for the curriculum converter.
Runs entirely in-memory — no files needed.

Usage:
  python tools/test_converter.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from curriculum_converter import (
    RawParagraph, parse_curriculum, generate_markdown,
    detect_module, detect_lesson, detect_block_kind,
)

# ── Sample curriculum in TXT format ──────────────────────────────────────────

# Simulates a DOCX with BOTH an outline section and the full expanded curriculum.
# This is the exact pattern causing 14 modules instead of 7 in production.
SAMPLE_WITH_OUTLINE = """\
MODULE 1: Understanding Credit Fundamentals
1.1: Anatomy of a Credit Score
1.2: The Five Factors
MODULE 2: Preparing for Battle
2.1: Pulling Your Reports
2.2: Building Your Battle Map
MODULE 7: Mastering Debt Arbitration
7.1: How Arbitration Works

MODULE 1: Understanding Credit Fundamentals
This module introduces the foundational concepts every Guild member must master.
1.1: Anatomy of a Credit Score
Your credit score is calculated from five weighted factors.
Payment history accounts for 35 percent of your score.
1.2: The Five Factors
Understanding each factor tells you where to focus.
MODULE 2: Preparing for Battle
Before you can fight, you need intelligence on your position.
2.1: Pulling Your Reports
You are entitled to a free report from each bureau annually.
2.2: Building Your Battle Map
Create a spreadsheet of every negative item across all three reports.
MODULE 7: Mastering Debt Arbitration
Advanced strategy using legal leverage against creditors.
7.1: How Arbitration Works
Arbitration is a private legal process defined in your credit agreements.
"""

SAMPLE_TXT = """\
MODULE 1: Understanding Credit Fundamentals
This module introduces the foundational concepts every Guild member must master.

Lesson 1.1: What Is Credit?
Credit is the ability to borrow money or access goods with the promise to repay.
Your credit history is recorded by three major bureaus: Equifax, Experian, and TransUnion.

Key Concepts:
- Payment history accounts for 35% of your FICO score
- Credit utilization accounts for 30%
- Length of credit history accounts for 15%

NOTE: A single 30-day late payment can drop your score by 90-110 points.

Lesson 1.2: The Five FICO Factors
FICO scores range from 300 to 850. Understanding each factor lets you target your recovery.

The factors in order of weight:
- Payment History (35%)
- Credit Utilization (30%)
- Length of History (15%)
- Credit Mix (10%)
- New Inquiries (10%)

MODULE 2: Preparing for Battle
Before disputing anything, you must gather intelligence about your current position.

Lesson 2.1: Pulling Your Credit Reports
You are entitled to one free report from each bureau per year at AnnualCreditReport.com.
Pull all three simultaneously to build a complete picture.

- Check Equifax, Experian, and TransUnion
- Look for accounts you do not recognize
- Note the date of first delinquency on each negative item

Lesson 2.2: Building Your Battle Map
Create a spreadsheet cataloging every negative item across all three reports.

---

MODULE 7: Mastering Debt Arbitration
Advanced strategy for members ready to use legal leverage against creditors.

Lesson 7.1: How Consumer Arbitration Works
Arbitration is a private legal process defined in the creditor agreement you signed.
It can be weaponized by consumers who know how to use it.

TIP: Many creditors will settle immediately upon receiving an arbitration demand rather than pay filing fees.
"""

# ── Tests ─────────────────────────────────────────────────────────────────────

def make_txt_paragraphs(text: str) -> list[RawParagraph]:
    from curriculum_converter import normalize
    paras = []
    for line in text.split("\n"):
        t = normalize(line)
        if not t:
            continue
        leading = len(line) - len(line.lstrip())
        paras.append(RawParagraph(text=t, indent=leading // 4))
    return paras


def test_module_detection():
    cases = [
        ("MODULE 1: Understanding Credit Fundamentals", (1, "Understanding Credit Fundamentals")),
        ("MODULE 7: Mastering Debt Arbitration",        (7, "Mastering Debt Arbitration")),
        ("CHAPTER 3: Building Your Arsenal",            (3, "Building Your Arsenal")),
    ]
    for text, expected in cases:
        para = RawParagraph(text=text)
        result = detect_module(para)
        assert result == expected, f"detect_module({text!r}) = {result}, want {expected}"
    print("  PASS: module detection")


def test_lesson_detection():
    cases = [
        ("1.1 What Is Credit?",             ("1.1", "What Is Credit?")),
        ("Lesson 2.1: Pulling Your Reports", ("2.1", "Pulling Your Reports")),
    ]
    for text, expected in cases:
        para = RawParagraph(text=text)
        result = detect_lesson(para)
        assert result == expected, f"detect_lesson({text!r}) = {result}, want {expected}"
    print("  PASS: lesson detection")


def test_block_detection():
    cases = [
        ("- Payment history accounts for 35%", "bullet"),
        ("NOTE: A critical point here.",       "callout"),
        ("---",                                "divider"),
        ("Regular paragraph content.",         "paragraph"),
    ]
    for text, expected in cases:
        para = RawParagraph(text=text)
        result = detect_block_kind(para)
        assert result == expected, f"detect_block_kind({text!r}) = {result!r}, want {expected!r}"
    print("  PASS: block kind detection")


def test_full_parse():
    paragraphs = make_txt_paragraphs(SAMPLE_TXT)
    modules = parse_curriculum(paragraphs)

    assert len(modules) == 3, f"Expected 3 modules, got {len(modules)}"
    assert modules[0].number == 1
    assert modules[0].title == "Understanding Credit Fundamentals"
    assert len(modules[0].lessons) == 2

    assert modules[1].number == 2
    assert len(modules[1].lessons) == 2

    # Module 7 (arbitration) — index 2
    assert modules[2].number == 7
    assert modules[2].slug == "mastering-debt-arbitration"
    assert modules[2].tier == "MASTER"
    assert modules[2].badge == "Elite"
    print("  PASS: full parse (3 modules, correct lessons, metadata)")


def test_markdown_generation():
    paragraphs = make_txt_paragraphs(SAMPLE_TXT)
    modules = parse_curriculum(paragraphs)
    md = generate_markdown(modules[0])

    assert "---" in md                                   # frontmatter exists
    assert "title: Understanding Credit Fundamentals" in md
    assert "module_number: 1" in md
    assert "tier_required: APPRENTICE" in md
    assert "## Lesson 1.1: What Is Credit?" in md        # lesson heading
    assert "- Payment history accounts for 35%" in md   # bullet preserved
    assert "> A single 30-day late payment" in md        # callout rendered
    print("  PASS: markdown generation (frontmatter, headings, bullets, callout)")


def test_outline_deduplication():
    """
    Verifies that a document containing an outline + expanded curriculum
    produces exactly the same modules as a document with just the expanded section.
    """
    paras_with_outline = make_txt_paragraphs(SAMPLE_WITH_OUTLINE)
    paras_clean        = make_txt_paragraphs(SAMPLE_TXT)

    modules_from_outline = parse_curriculum(paras_with_outline)
    modules_from_clean   = parse_curriculum(paras_clean)

    # Both should produce the same number of modules — no duplicates
    assert len(modules_from_outline) == len(modules_from_clean), (
        f"Outline dedup failed: got {len(modules_from_outline)} modules "
        f"(expected {len(modules_from_clean)})"
    )

    # No duplicate module numbers
    nums = [m.number for m in modules_from_outline]
    assert len(nums) == len(set(nums)), f"Duplicate module numbers: {nums}"

    # No duplicate slugs
    slugs = [m.slug for m in modules_from_outline]
    assert len(slugs) == len(set(slugs)), f"Duplicate slugs: {slugs}"

    # Module 7 should use META slug and be MASTER tier
    mod7 = next((m for m in modules_from_outline if m.number == 7), None)
    assert mod7 is not None
    assert mod7.slug == "mastering-debt-arbitration"
    assert mod7.tier == "MASTER"

    print("  PASS: outline deduplication (outline skipped, expanded curriculum parsed, no duplicate slugs)")


def run_all():
    print("Running curriculum_converter tests…\n")
    test_module_detection()
    test_lesson_detection()
    test_block_detection()
    test_full_parse()
    test_markdown_generation()
    test_outline_deduplication()
    print("\nAll tests passed.")


if __name__ == "__main__":
    run_all()
