# Resume Tailoring

This folder holds the workflow for creating role-specific resume variants from a full job description.

The goal is controlled customization:

- Keep the underlying story true.
- Spell out LinkedIn, GitHub, and personal-site destinations in the header without the protocol (for example, `github.com/candidate`) rather than using labels such as `LinkedIn` or `GitHub`; keep `portfolio.example.com` as the canonical personal-site link and place project URLs in their project entries.
- Always state in the Summary that the candidate is seeking a software engineering internship/co-op for Spring and/or Summer 2027; do not place this as a separate header tagline.
- Do not rewrite the whole resume for each job.
- Adjust the summary lightly.
- Apply the required Qualification Coverage process below before selecting or trimming skills.
- For prompt engineering, LLM, generative AI, AI-agent, or agentic roles, explicitly consider the supported terms `agentic engineering`, `prompt engineering`, `context engineering`, `LLM evaluation`, `AI agents`, `multi-agent systems`, `subagent architectures`, `MCP`, `tool calling`, `RAG`, `model reliability`, and `token optimization`. Match the job description's exact wording when it is supported by JobMax evidence; do not keyword-stuff.
- Pick the most relevant projects and bullets from `projects/`.
- Pull experience and leadership bullets from `experience/` and `leadership/`.
- Bold important metrics and role-matching technical phrases.
- Use the one-page space well; do not leave a sparse resume if relevant supported bullets can fit.
- Preserve the stretchable vertical-spacing system so unused page height is distributed between sections and entries instead of collecting at the bottom.
- After rendering, rewrite bullets with short orphaned final lines; prefer a clean one-line bullet or two visually balanced lines without dropping supported impact.
- Build a PDF and verify it is one page.

## Folder Layout

| Path | Purpose |
|---|---|
| `roles/` | One folder per role-specific resume variant |
| `templates/` | Templates for job descriptions and tailoring notes |
| `../profile/resume/resume.tex` | Base resume source |
| `../profile/resume/reference-template.md` | Standing style/density reference from the uploaded resume |
| `../projects/` | Project brag sheets and bullet banks |
| `../experience/` | Work/research brag sheets and bullet banks |
| `../leadership/` | Leadership/nonprofit/community brag sheets and bullet banks |
| `../scripts/` | Scaffolding, build, and verification scripts |

## Standard Flow

1. Save the full job description as Markdown or plain text.
2. Create a role folder:

```bash
python3 scripts/new_resume_variant.py \
  --company "Company" \
  --role "Software Engineering Intern" \
  --jd path/to/job-description.md
```

3. Open `resumes/roles/<slug>/tailoring-notes.md` and complete the Qualification Coverage table below before drafting. This also applies to application-integrated generation and reuse of existing resumes.
4. Use [../profile/resume/reference-template.md](../profile/resume/reference-template.md) and the relevant files under `profile/`, `experience/`, `projects/`, and `leadership/` to choose summary, skills, experience, leadership, projects, bullet changes, and page density.
5. Edit only `resumes/roles/<slug>/resume.tex`; keep the base resume untouched.
6. Build and check:

```bash
scripts/build_resume.sh resumes/roles/<slug>
```

The build script copies the final PDF to `resumes/roles/<slug>/resume.pdf` and runs a one-page check. Generated PDFs and build folders are ignored by Git by default.

## Qualification Coverage — Required for Every Variant

Make qualifications explicit enough for a recruiter, technical reviewer, or resume parser to find without inference. the candidate calls this the "filter out the dumb" approach: preserve obvious, relevant basics alongside distinguishing achievements. Use this internal phrase only in workflow discussion, not in resumes or outreach. Keyword presence improves clarity; it does not guarantee ATS passage or a particular matching score.

1. **Classify and map the posting.** Record `Single-team`, `Multi-team intake`, or `Unclear` in `tailoring-notes.md`, with the JD wording supporting the classification. Multiple locations or a long technology list alone do not establish multi-team hiring. For Single-team or Unclear postings, review the full role's required skills, preferred stack, and major duties; do not invent a narrower track to dismiss gaps. For explicit Multi-team intake postings, choose the strongest track, assess shared requirements plus that track's skills, and separate other teams' optional technologies. Preserve AND/OR logic and proficiency levels: "Python or Bash" needs one supported alternative; "JavaScript, HTML, and CSS" needs all three assessed. A "plus" remains optional even beneath a Required heading. For a general company resume without a JD, label the review as a baseline, not verified job eligibility.
2. **Use a lightweight skills review.** Treat the candidate's request to tailor or apply as standing confirmation of ordinary technical skills and tools named in the role's minimum qualifications. Put every relevant minimum-qualification language, framework, data tool, platform, and development tool directly in Skills without asking the candidate to reconfirm it; use `familiarity with` or `fundamentals` when the posting or profile indicates basic exposure. Reuse all explicit profile confirmations. This standing confirmation does not authorize invented project use, professional depth, years of experience, metrics, specialist credentials, legal/eligibility answers, or claims that a tool was used at a prior employer. Use `Covered`, `Partial`, `Learning target`, `Unverified`, `Gap`, or `Not applicable` for the remaining review. For a close-fit role with a missing preferred or specialist skill, add it to the profile's Learning Targets with the role, date, and a concrete fundamentals exercise; keep drafting rather than rejecting the role or blocking the resume. Ask one grouped question only when a claim falls outside the standing confirmation and materially changes the result. Reserve stronger evidence checks for achievements, metrics, specialist expertise, and claims about prior jobs.
3. **Write explicit coverage.** Include all supported required technical skills and as many relevant supported preferred/baseline skills as fit readably. Retain Git/version control for SWE resumes; include Linux CLI, IDEs, Microsoft Office, debugging, testing, data structures, and algorithms where relevant. These are not too obvious to name. Use the posting's terminology when it accurately describes the evidence; pair common synonyms or acronym expansions where useful. React does not replace an explicit HTML assessment, a GitHub URL does not replace Git, and Azure DevOps does not establish Azure cloud administration.
4. **Attach proof.** Put compact tool/language coverage in Skills and demonstrate the strongest role requirements in experience/project bullets. Show communication through presentations/documentation and collaboration through actual team or partnership work. Keep employer names clean; team names can follow the role title. Use normal separate Experience and Projects sections unless a user or recruiter-specific variant calls for another format.
5. **Prioritize page space.** Preserve supported required skills first, then relevant preferred skills, baseline development tools, and differentiating evidence. Trim repeated AI terminology, less relevant tools, and redundant prose before removing a requirement. Record any supported criterion omitted for space and its reason. Keep one readable page with normal visible text; hidden text, repeated keyword lists, and invented tools are not acceptable.
6. **Run a JD-to-LaTeX keyword review.** After drafting, compare the posting's languages, tools, technical activities, and selected-track terms with visible content in the generated `resume.tex` (exclude comments, preamble, and hidden link targets; normalize LaTeX escapes such as `C\#`). Report exact matches separately from semantic matches and absent terms. For each relevant absence, add supported wording, ask about familiarity, create a Learning Target, or explain why the term is optional/off-track. For Single-team or Unclear postings, give every missing required/core-stack term an individual disposition and prioritize repeated or central preferred skills; optional does not mean irrelevant. Use off-track exclusions only when the JD actually separates teams/assignments. Prefer accurate exact JD wording over a semantic-only match where natural (for example, "build and deployment automation"). Review as a recruiter: identify the strongest two or three fit signals, rank remaining gaps by likely importance to this role, and distinguish an easy wording fix from missing familiarity. A named framework can provide semantic coverage without being an exact keyword hit. Counts describe only the disclosed term list, not an ATS score or interview probability.
7. **Check the final PDF.** Extract text from the exact final artifact, normalize Unicode ligatures and whitespace, and confirm the final visible content retains the reviewed skills and evidence. Review reading order, links, clipping, and line balance visually. Use degree and expected graduation date for education eligibility; keep school-return, hours, and onsite eligibility checks in notes/application answers, not boilerplate resume sentences. Do not insert "Returning to school after Summer 2027" or equivalents. Rebuild and repeat keyword checks after content edits.

Completion requires a readable tailored PDF, a compact keyword/recruiter review, and actionable handling of relevant missing skills. Partial, Learning target, Unverified, and Gap findings do not block resume delivery or justify rejecting an otherwise strong fit. Keep detailed eligibility checks out of resume prose; do not describe unverified eligibility as confirmed. Never invent a match percentage.

Scope claims precisely: Linux CLI is not Linux administration; Microsoft Office is not advanced Excel/VBA; software testing is not a claimed coverage percentage. A general "I meet the qualifications" statement can support ordinary fundamentals in context, but does not establish every specialist duty or every tool in an example list. A university curriculum verifies course titles, not personal completion; obtain course-level confirmation before listing completed coursework. Existing authorization is sufficient for confirmed facts; do not ask again.

Western Digital and GM are multi-team trial examples, not a reason to discount missing terms in single-team postings. A campus-specific format such as Lockheed's is a scoped exception, not the default template.

## Fast Resume-Only Flow

Use [the resume-only generator](../agents/tailor-resume.md) when the request is
only to generate or revise resumes. This path deliberately excludes application
forms, tracker and pipeline updates, controlled application answers, job
discovery, outreach, and their validations.

For multiple roles, capture the supplied descriptions, scaffold all variants,
tailor them as one batch, build the PDFs concurrently, and perform one render
inspection per final page. Load the closest existing variant and only the
evidence files needed to support changed claims.

The default density baseline is:

- Paychex with its strongest current AI-platform evidence and the supported 55%
  token-reduction result;
- a two-line RIT Student Researcher entry;
- Real Wave's scale and performance metrics;
- two role-relevant projects;
- both Bay Area Stem Academy and RIT Asian Culture Society leadership entries.

Depart from this baseline only for a user request, truth constraint, or real
one-page layout conflict.

## Customization Rules

| Section | Allowed Changes | Avoid |
|---|---|---|
| Header | Preserve name, visibly spelled-out contact destinations without protocols, and the canonical `portfolio.example.com` personal-site link | Replacing the personal site with a project URL or reverting to generic link labels |
| Summary | Preserve the Spring/Summer 2027 internship/co-op target while lightly tuning role emphasis | Dropping the target, moving it into the header, inventing new experience, or rewriting identity |
| Skills | Reorder, trim, and emphasize matching skills | Listing skills not supported by profile/projects/experience |
| Experience | Select or lightly adapt supported bullets from `experience/` | Rewriting job history around the JD |
| Projects | Choose the most relevant 1-3 projects and bullets | Including every good project |
| Leadership | Keep the most relevant leadership proof if space and role fit justify it | Removing strong leadership by default |

## Density And Emphasis

Before calling a role-specific PDF final, check the rendered page:

| Check | What Good Looks Like |
|---|---|
| One page | The PDF is exactly one page |
| Density | The page feels full, with no obvious empty lower section |
| Line balance | Bullets fit cleanly on one line or use two lines well, without a dangling word or short phrase |
| Emphasis | Important metrics, scale numbers, and role-matching keywords are bolded |
| Selectivity | Bold text highlights evidence, not entire bullets |
| Truthfulness | Every bolded claim is supported by `profile/`, `projects/`, `experience/`, `leadership/`, or the source resume |

Default density target: match the uploaded reference resume's fuller one-page feel. If a rendered PDF leaves a large blank lower section, restore supported Paychex, Chatio, Real Wave, BASA, or RIT ACS detail until the page is full but still readable.

### Flexible Vertical Spacing

The canonical resume template uses stretchable LaTeX glue as an auto-layout system:

- Page geometry defaults to 0.45-inch left and right margins and 0.32-inch top and bottom margins.
- Gaps between major sections receive twice the available stretch of gaps between entries.
- Gaps expand together until the final content reaches the bottom margin.
- On content-dense resumes, the flexible portion collapses automatically to preserve the one-page limit.

Keep this behavior when tailoring a variant. Do not replace the flexible gaps with fixed `\vspace` values or add a trailing flexible gap after the final entry. Existing variants that use explicit `\majorGap` and `\entryGap` commands implement the same rule.

## PDF Tooling

The build script will use the first available compiler:

| Preferred Order | Tool |
|---|---|
| 1 | `tectonic` |
| 2 | `latexmk` |
| 3 | `pdflatex` |
| 4 | `xelatex` |
| 5 | `lualatex` |

Tectonic is currently available on this machine. The build script retains the
fallback order above for portability.
