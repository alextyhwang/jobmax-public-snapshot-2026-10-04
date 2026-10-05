# LinkedIn Content Archive (manual only)

LinkedIn content is not an active JobMax automation. These files are retained
as a manual archive and are edited only when the candidate explicitly requests a post.

Use this folder to plan LinkedIn posts, store post photos, and keep drafts synced through GitHub.

For agents: read [AGENTS.md](AGENTS.md) before drafting, reorganizing, or updating post status.

## Folder Structure

| Folder | Use |
|---|---|
| `ideas/` | Raw ideas, hooks, proof points, and future post queues |
| `scheduled/` | Posts with a target publish date |
| `published/` | Final copy and media notes after a post goes live |
| `templates/` | Reusable post planning templates |

## Workflow

1. Create one folder per post under `scheduled/` using `YYYY-MM-DD-short-topic`.
2. Add the post draft to `draft.md`.
3. Drag photos into that post's `media/` folder.
4. Use clear filenames such as `01-alex-speaking.jpg`, `02-students-hackathon.jpg`, and `03-robotics-challenge.jpg`.
5. Update `calendar.md` when the status changes.
6. After publishing, move or copy the final post folder to `published/`.

## Drag-And-Drop Photo Workflow

Each scheduled post has its own `media/` folder. Put only the images intended for that specific post in that folder.

Example:

```text
content/linkedin/scheduled/2026-06-08-basa-sandisk-personal/
  draft.md
  media/
    01-alex-speaking.jpg
    02-students-working.jpg
    03-robotics-challenge.jpg
```

Recommended filename pattern:

```text
01-main-subject.jpg
02-supporting-context.jpg
03-activity-or-proof.jpg
```

The number controls the intended LinkedIn order. Agents should preserve this order unless asked to reorder the post.

## Media Guidelines

- Prefer 4-6 strong photos for personal posts and 6-10 photos for organization recaps.
- Put the strongest first image first, because LinkedIn emphasizes the first image.
- Avoid close-up identifiable student photos unless BASA has permission.
- Prefer wide event shots, photos centered on the candidate speaking, partner signage, group photos with permission, and hands-on activity shots.
- Keep files reasonably sized before committing. GitHub can store images, but large batches of full-resolution photos will bloat the repo.

## Posting Principles

- LinkedIn is the primary channel for recruiter-facing posts.
- X can be used for shorter project wins or technical notes, but do not mirror LinkedIn posts word for word.
- Most personal posts should make one clear point: leadership, technical proof, project traction, or a lesson learned.
- Use few or no hashtags. Concrete nouns, tagged organizations, and strong photos usually matter more.
