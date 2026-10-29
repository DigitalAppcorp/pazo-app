# find-skills — provenance and safe use

- **Canonical upstream:** https://github.com/vercel-labs/skills/tree/main/skills/find-skills
- **Source reviewed:** `SKILL.md` GitHub blob `a41bdd074bb587afd861332cf2f473f3154de4d7` (29 October 2026).
- **Author/license:** Vercel Labs; MIT license included alongside this skill.
- **Scope:** repo-level Codex discovery in `.agents/skills/find-skills/SKILL.md`; not a global installation and does not change the running ChatGPT configuration.
- **Files inspected:** the source skill consists of a text-only `SKILL.md` and has no bundled scripts; a separate CLI (`npx skills`) is needed to search/add/update packages.
- **Security governance:** discovery and suggestions are allowed. Before adopting *any newly found skill*, independently inspect author/repository, precise source/revision, included SKILL.md/scripts, permissions, dependency chain, licensing, and whether it requests shell or credential access. A popularity metric or automated security badge does not constitute approval.
- **Authorization:** never auto-install all search results, execute unknown scripts, grant permissions, introduce secrets, update production, or run `npx skills add ... -y` for a third-party candidate merely because a search returned it. The Product Owner must approve each new skill installation or explicitly delegate that decision; comply with existing Brain OS product gates and AGENTS.md. `find-skills` itself was specifically requested.
- **Environment:** Codex reads repo-scoped skills when the working directory is within the repository. An open/updated local checkout may be needed to load the committed copy; to enable across *all* projects the user would separately install into their personal `~/.agents/skills` location.
- **Maintenance:** changes to upstream do not sync automatically; review the new revision before updating. No `npm` package or executable was added to this repository.
