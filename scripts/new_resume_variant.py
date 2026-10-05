#!/usr/bin/env python3
"""Create a role-specific resume workspace from the base LaTeX resume."""

from __future__ import annotations

import argparse
import re
import shutil
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE_RESUME = ROOT / "profile" / "resume" / "resume.tex"
ROLES_DIR = ROOT / "resumes" / "roles"
TAILORING_TEMPLATE = ROOT / "resumes" / "templates" / "tailoring-notes.md"


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "resume-variant"


def read_optional(path: str | None) -> str:
    if not path:
        return "TBD\n"
    return Path(path).read_text()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--company", required=True, help="Company name")
    parser.add_argument("--role", required=True, help="Role title")
    parser.add_argument("--jd", help="Path to the full job description")
    parser.add_argument("--source-url", default="TBD", help="Job posting URL")
    parser.add_argument("--location", default="TBD", help="Role location")
    parser.add_argument("--work-term", default="Spring 2027", help="Target term")
    parser.add_argument("--slug", help="Override generated folder slug")
    args = parser.parse_args()

    slug = args.slug or slugify(f"{args.company}-{args.role}")
    role_dir = ROLES_DIR / slug
    role_dir.mkdir(parents=True, exist_ok=False)

    shutil.copyfile(BASE_RESUME, role_dir / "resume.tex")

    jd_text = read_optional(args.jd)
    (role_dir / "job-description.md").write_text(
        "\n".join(
            [
                "# Job Description",
                "",
                "## Role Metadata",
                "",
                "| Field | Value |",
                "|---|---|",
                f"| Company | {args.company} |",
                f"| Role | {args.role} |",
                f"| Location | {args.location} |",
                f"| Work term | {args.work_term} |",
                f"| Source URL | {args.source_url} |",
                f"| Date saved | {date.today().isoformat()} |",
                "",
                "## Full Job Description",
                "",
                jd_text.rstrip(),
                "",
            ]
        )
    )

    notes = TAILORING_TEMPLATE.read_text()
    notes = notes.replace("COMPANY", args.company)
    notes = notes.replace("ROLE", args.role)
    notes = notes.replace("SLUG", slug)
    (role_dir / "tailoring-notes.md").write_text(notes)

    print(f"Created {role_dir.relative_to(ROOT)}")
    print(f"Next: fill {role_dir.relative_to(ROOT) / 'tailoring-notes.md'}")
    print(f"Build: scripts/build_resume.sh {role_dir.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
