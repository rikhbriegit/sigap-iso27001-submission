# SIGAP — Accountability sheet

One page: what the agents can access, what runs on its own, what needs a human, and what never happens.
"Code" marks rules enforced by the deterministic tools or the dashboard server; "prompt" marks rules that live only in the skill text.

| What the agents can **access** | What runs **automatically** | What needs **human approval** | What SIGAP **never** does |
|---|---|---|---|
| Manager chat (IT Manager) | Hash check of every evidence file against the Data-Operation manifest *(code)* | GATE 1: focus items, schedule and staff tasks | The Manager never gives an audit verdict — the external Auditor assesses *(prompt + dashboard checks)* |
| Gmail + Drive connectors: Manager and Auditor only | Citation and status check of the assessment (`evidence.js check`) *(code)* | Creating any WorkBuddy task (automation item) | Agents never create or edit evidence; only byte-identical copies from Data-Operation are indexed *(code)* |
| Drive only: the six IT staff tasks (no Gmail) | Pengawas: reads real task state every 60 s, restarts the **same** stalled task (max 3 per phase), switches model when one is saturated, then escalates *(code)* | Every evidence release, file by file | Never sends to an address outside the contact list *(code)* |
| Data-Operation document repository: read-only | Plain-language automatic checks on every decision card; unsafe options are locked *(code)* | Every email and every calendar invitation (exact recipients, time, body) | Never marks an email or invitation as sent without a Gmail message id *(code)* |
| Contacts: the fictional company's IT unit, Board/CISO and Auditor (10 named contacts) | Hash-chained audit log of every action and decision *(code)* | Publishing the report (FINAL versions), handover to the Manager, CAP, closing | Never executes instructions embedded in documents or pasted text — reports them instead *(prompt; tested H02, B06)* |
| — | Dashboard opens itself in the Manager chat's right panel and shows phase/status computed from the real state *(code)* | Escalations after 3 failed retries ("Coba lagi" / continue as audit limitation) | Never gives numeric scores — conformity statuses only *(code: `evidence.js check`)* |
| — | — | Revisi / Tolak always with a fixed reason (no free text) *(code)* | Free text never counts as an approval *(code)* |
| — | — | — | Agents never change tools, skills or the dashboard server *(prompt rule 14; sealed records detect edits)* |

**Out of scope answers.** Any request outside the current audit run is answered with exactly: *"Mohon maaf, permintaan atau pembahasan
tersebut tidak ada di scope kami."* (tested B04: salary question).

**Honest limits.** Scope and automation rules are still partly prompt-level; connectors are still called by the agents. In every test run a
single operator answered the cards on behalf of the simulated owners and the manager. Readiness simulation only — not a certification.
