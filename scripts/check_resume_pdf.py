#!/usr/bin/env python3
"""Check that a generated resume PDF exists and is exactly one page."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def page_count_with_quartz(path: Path) -> int | None:
    try:
        from Foundation import NSURL
        from Quartz import PDFDocument
    except Exception:
        return None

    doc = PDFDocument.alloc().initWithURL_(NSURL.fileURLWithPath_(str(path)))
    if doc is None:
        return None
    return int(doc.pageCount())


def page_count_with_mdls(path: Path) -> int | None:
    try:
        result = subprocess.run(
            ["mdls", "-raw", "-name", "kMDItemNumberOfPages", str(path)],
            check=True,
            text=True,
            capture_output=True,
        )
    except Exception:
        return None
    value = result.stdout.strip()
    if value.isdigit():
        return int(value)
    return None


def page_count_with_pdfinfo(path: Path) -> int | None:
    try:
        result = subprocess.run(
            ["pdfinfo", str(path)],
            check=True,
            text=True,
            capture_output=True,
        )
    except Exception:
        return None
    for line in result.stdout.splitlines():
        if line.lower().startswith("pages:"):
            value = line.split(":", 1)[1].strip()
            if value.isdigit():
                return int(value)
    return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", help="Path to resume PDF")
    args = parser.parse_args()

    pdf = Path(args.pdf)
    if not pdf.exists():
        print(f"PDF not found: {pdf}", file=sys.stderr)
        return 2

    pages = page_count_with_quartz(pdf)
    if pages is None:
        pages = page_count_with_mdls(pdf)
    if pages is None:
        pages = page_count_with_pdfinfo(pdf)

    if pages is None:
        print(f"Could not determine page count for {pdf}", file=sys.stderr)
        return 3

    if pages != 1:
        print(f"PDF page check failed: {pdf} has {pages} pages", file=sys.stderr)
        return 1

    print(f"PDF page check passed: {pdf} is 1 page")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
