# LinkedIn Content Agent Instructions

Use this folder when asked to plan, draft, revise, schedule, or organize LinkedIn posts.

## Read First

Before drafting:

1. Read `content/linkedin/calendar.md` to understand planned posts and status.
2. Read the target post's `draft.md` if it exists.
3. Read `agents/linkedin-post-ideas.md` for the repo-specific content workflow.
4. Use `.agents/skills/linkedin-posts/SKILL.md` for LinkedIn format, hook, length, and media guidance.
5. Read only relevant source files from `profile/`, `projects/`, `experience/`, `leadership/`, `outreach/`, or `plan/`.

For BASA posts, also use the BASA skill if available at:

```text
USER_HOME/private-path Tools/skills/basa-skill
```

Relevant BASA references:

- `SKILL.md`
- `references/organization.md`
- `references/privacy-and-communications.md`

## Folder Contract

Each post folder should contain:

```text
draft.md
media/
  README.md
  optional-images.jpg
```

Do not mix photos from different posts in the same `media/` folder.

## Agent Tasks

When asked to create a new post plan:

1. Create `content/linkedin/scheduled/YYYY-MM-DD-short-topic/`.
2. Create `draft.md` using `content/linkedin/templates/post-plan.md`.
3. Create `media/README.md` with post-specific photo guidance.
4. Add or update the row in `content/linkedin/calendar.md`.

When asked to draft or revise a post:

1. Identify the target audience and goal.
2. Cite the source files used.
3. Keep recruiter-facing personal posts specific, scannable, and proof-driven.
4. Keep organization posts community-centered and partner-safe.
5. Prefer no hashtags or 1-2 highly relevant hashtags.
6. Include a media order recommendation when photos exist or are expected.

When asked to review photos:

1. List files in the post's `media/` folder.
2. If visual inspection is needed, inspect local images.
3. Recommend a first image and posting order.
4. Flag privacy issues, especially identifiable minors or student details.

## Status Values

Use these status labels in `calendar.md`:

- `Idea`
- `Draft`
- `Needs photos`
- `Ready`
- `Posted`
- `Archived`

Only mark `Posted` when the user says the post was published.

## Privacy And Accuracy Rules

- Do not invent metrics, partners, attendee names, or outcomes.
- Do not include student names, parent names, private emails, or identifiable student details.
- Do not claim SanDisk endorsement beyond a collaboration unless source material explicitly supports it.
- Use "SanDisk collaboration" or "BASA x SanDisk event" unless the user confirms stronger wording.
- Ask for missing metrics only when the post would materially improve with them.

## Output Expectations

For publish-ready copy, provide:

1. First line under 210 characters.
2. Full post with approximate character count.
3. Suggested photo order.
4. Tagging note.
5. Hashtag recommendation, including "none" when that is best.
