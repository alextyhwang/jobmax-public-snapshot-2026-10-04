#!/usr/bin/env bash
set -e

if [ "$#" -lt 1 ]; then
  echo "Usage: scripts/build_resume.sh resumes/roles/<slug>" >&2
  exit 2
fi

role_dir="$1"
tex_file="${2:-resume.tex}"

if [ ! -d "$role_dir" ]; then
  echo "Role directory not found: $role_dir" >&2
  exit 2
fi

if [ ! -f "$role_dir/$tex_file" ]; then
  echo "LaTeX file not found: $role_dir/$tex_file" >&2
  exit 2
fi

mkdir -p "$role_dir/build"

build_with_pdflatex_like() {
  local compiler="$1"
  (
    cd "$role_dir"
    "$compiler" -interaction=nonstopmode -halt-on-error -output-directory build "$tex_file"
    "$compiler" -interaction=nonstopmode -halt-on-error -output-directory build "$tex_file" >/dev/null
  )
}

if command -v tectonic >/dev/null 2>&1; then
  (
    cd "$role_dir"
    tectonic --outdir build "$tex_file"
  )
elif command -v latexmk >/dev/null 2>&1; then
  (
    cd "$role_dir"
    latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=build "$tex_file"
  )
elif command -v pdflatex >/dev/null 2>&1; then
  build_with_pdflatex_like pdflatex
elif command -v xelatex >/dev/null 2>&1; then
  build_with_pdflatex_like xelatex
elif command -v lualatex >/dev/null 2>&1; then
  build_with_pdflatex_like lualatex
else
  cat >&2 <<'EOF'
No LaTeX compiler found.

Install one of:
  - tectonic
  - latexmk plus a TeX distribution
  - pdflatex / xelatex / lualatex

Then rerun:
  scripts/build_resume.sh resumes/roles/<slug>
EOF
  exit 127
fi

pdf_name="$(basename "$tex_file" .tex).pdf"
if [ ! -f "$role_dir/build/$pdf_name" ]; then
  echo "Expected PDF was not created: $role_dir/build/$pdf_name" >&2
  exit 1
fi

cp "$role_dir/build/$pdf_name" "$role_dir/resume.pdf"
python3 scripts/check_resume_pdf.py "$role_dir/resume.pdf"
echo "Built $role_dir/resume.pdf"
