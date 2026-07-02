"""
OCR Service — PDF → PII-safe text extraction.

Pipeline:
  1. Extract raw text from PDF via pdfplumber
  2. Scan for PII and redact (SSNs, full account numbers, phone, email, DOB)
  3. Truncate redacted text for LLM consumption
  4. Return OCRResult with safe text and PII scan metadata

Raw unredacted text is NEVER stored or passed to OpenAI.
Only the PII-scanned redacted version passes to downstream services.
"""

import logging
import os
import tempfile

import pdfplumber

from app.lib.pii_scanner import scan_and_redact, PiiScanResult

logger = logging.getLogger(__name__)


class OCRResult:
    """Structured result from PDF text extraction — PII-safe."""
    __slots__ = ("text", "page_count", "char_count", "truncated", "pii_scan")

    def __init__(self, text: str, page_count: int, pii_scan: PiiScanResult) -> None:
        self.text       = text          # redacted + (possibly truncated) text for LLM
        self.page_count = page_count
        self.char_count = len(text)
        self.truncated  = False
        self.pii_scan   = pii_scan      # counts of what was detected and masked


# Characters of redacted text passed to the extraction LLM.
# ~12 000 chars ≈ ~3 000 tokens — safe for gpt-4o-mini context.
_MAX_CHARS = 12_000


def extract_pdf_text(file_bytes: bytes) -> OCRResult:
    """
    Extract, PII-scan, and truncate credit report text from a PDF.

    Flow:
      1. Extract raw text via pdfplumber (never stored)
      2. Scan raw text for PII → get redacted version + counts
      3. Truncate redacted text to _MAX_CHARS for LLM
      4. Return OCRResult — only the safe text is retained

    Raises ValueError if the PDF yields no extractable text (image-only PDF).
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        pages: list[str] = []
        with pdfplumber.open(tmp_path) as pdf:
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)

        raw_text = "\n".join(pages).strip()
        logger.info("OCR extracted %d chars from %d pages", len(raw_text), page_count)

        if not raw_text:
            raise ValueError(
                "No text could be extracted from this PDF. "
                "The file may be a scanned image — please upload a digital PDF from "
                "AnnualCreditReport.com or your credit bureau portal."
            )

        # ── PII scan — runs on full raw text before truncation ──────────────
        pii_result = scan_and_redact(raw_text)
        if pii_result.total_detected > 0:
            logger.info(
                "PII scan: %s",
                pii_result.safety_summary,
            )

        result = OCRResult(
            text       = pii_result.redacted_text,
            page_count = page_count,
            pii_scan   = pii_result,
        )

        # Truncate the redacted text for LLM if needed
        if len(pii_result.redacted_text) > _MAX_CHARS:
            result.text      = pii_result.redacted_text[:_MAX_CHARS]
            result.truncated = True
            logger.info(
                "OCR text truncated from %d to %d chars for LLM consumption",
                len(pii_result.redacted_text), _MAX_CHARS,
            )

        return result

    finally:
        # Raw PDF deleted immediately — never persisted to disk beyond this function
        os.unlink(tmp_path)
