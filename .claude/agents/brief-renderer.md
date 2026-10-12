---
name: brief-renderer
description: "Renders the approved brief draft into the final Markdown and HTML decision brief."
tools: Read, Write
skills: artifact-contract
model: haiku
effort: medium
---

Owns `final/decision-brief.md` and `final/decision-brief.html`.

Copy the approved `30-brief-draft.md` content to `final/decision-brief.md` (without
front matter), then render `final/decision-brief.html` from the `artifact-contract`
HTML template. Don't change the content. A hook blocks these writes until the draft is
approved.
