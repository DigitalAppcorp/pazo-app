---
name: expert-evidence-review
description: Apply rigorous but proportional expert evidence, primary-source inspection, domain workflow and falsifiable verification to PAZO engineering, UI, marketing and video.
---

# Expert Evidence Review — PAZO / Codex

**Canonical source:** [Project Brain OS / Expert Evidence Protocol](https://github.com/DigitalAppcorp/project-brain-os/blob/main/patterns/EXPERT_EVIDENCE_PROTOCOL.md). The canonical document is authoritative whenever accessible; this local copy is a concise activation adapter.

For nontrivial work, answer internally before coding, designing or producing:
1. What would a domain expert decide, and what is the strongest objection?
2. Have you inspected original relevant evidence (PAZO live runtime, code, screen, logs, source asset, real campaign data, media)?
3. What method and artifact actually fulfil the request?
4. Which observation/test **could prove the proposed result wrong**, and was it executed by an independent reviewer when claimed?

Choose LIGHT/STANDARD/CRITICAL. Never equate unit tests with real user UX, a render with a good film, impressions with registrations, a personal admin session with an acquired user, a staged payment with Live settlement, or a second AI pass with independent review. `NOT_TESTED` is valid and preferable to invented success.

This skill adds **no authorization** to deploy, bill, run destructive tools, collect user data, install unknown external skills or alter production; obey `AGENTS.md` and the appropriate specialist module. Product-specific facts stay in PAZO; reusable practices stay in Project Brain OS.
