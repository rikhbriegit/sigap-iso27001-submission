# SIGAP — ISO 27001 readiness self-assessment that asks, shows and records

**Tencent "AI CAN DO IT" Hackathon Indonesia 2026 · Challenge B — The Office Agent · built on WorkBuddy**

> **Blurb (≤ 10 words):** *Audit ISO 27001 yang meminta izin, menunjukkan bukti, mencatat.*
> *ISO 27001 self-assessment that asks permission, shows evidence, records everything.*

📺 **Demo video:** _link to be added_ · 📄 [Accountability sheet](ACCOUNTABILITY.md) · 🧪 [Test results](TEST-RESULTS.md) · 🏗️ [Architecture](docs/ARCHITECTURE.md) · 💡 [Product sharing](PRODUCT-SHARING.md)

> **What SIGAP is — and is not.** SIGAP **does not replace** an external auditor or a real ISO 27001 certification. A company can run a
> readiness **self-assessment** before the certification auditor comes; SIGAP **simulates** that process end to end inside WorkBuddy, on a
> fictional company (PT Nusantara Digital Pratama). In every test run, the decisions were answered by the operator on behalf of the
> simulated owners and the manager.

---

## 1. Project overview

| | |
|---|---|
| **Challenge** | B — The Office Agent: turn messy requests into emails, meetings and tasks, act only after approval, ask when ambiguous, never execute instructions found inside files |
| **Scenario** | An ISO/IEC 27001:2022 readiness audit of an IT department: an external Auditor agent proposes 3–5 focus items and a schedule, IT staff agents collect evidence, the IT Manager approves in a dashboard, the Auditor assesses and publishes the report, the Board/CISO receives it |
| **Target users** | IT Managers and IT staff preparing for ISO 27001 certification; the Board/CISO who receives the result |
| **Value** | An audit trail where every outbound action is provable: who approved it, the exact payload (sha256), when, and the Gmail message id — with conformity statuses (Conform / Minor NC / Major NC / OFI / N/A), never invented scores |

**Why this theme.** A readiness audit *is* office work: collect evidence from owners, schedule interviews, send letters and invitations,
compile a report. That maps one-to-one to Challenge B. And the story fits the hackathon's five accountability rules: *an agent that practises
the accountability of the standard it assesses* — keeping an audit log is literally control A.8.15 Logging.

## 2. Real-world insight

- **Evidence is scattered** across staff folders; collecting it by chat is slow and untraceable.
- **Self-assessment is not independent** when the auditee also assesses and publishes.
- **AI can over-claim**: an assistant that writes "Compliant" without evidence, invents numbers, or emails the wrong person is worse than none.

SIGAP separates duties (external Auditor vs internal Manager and staff), forces every human decision through fixed-option cards or the
dashboard, binds every outbound action to its exact payload, and takes evidence only from the company document repository.

## 3. Solution design

**Agents (WorkBuddy):** `ISO270001-NN Manager` (chat, IT Manager, internal) · `ISO270001-NN Auditor` (scheduled task, Gmail + Drive,
external) · up to six `Staf …` tasks (Drive only, no Gmail). Nine phases FASE 0–8, from engagement to closing.

**Deterministic layer (this repo, Node.js):**
- `tools/outbox.js` — every outbound action is an outbox item (exact payload + sha256); decide → verify → execute → done with proof
  (e.g. a Gmail message id). Refuses addresses outside the contact list, duplicate sends, stale schedules, and "sent" without a Gmail id.
- `tools/evidence.js` — evidence must be a byte-identical copy of a Data-Operation document (hash in the manifest); agents never create evidence.
- `tools/integrity.js`, `tools/audit.js` — sealed records and a hash-chained audit log.
- `progress-dashboard/` — the **SIGAP dashboard**: one place for every human decision, shown in the Manager chat's right panel within ~2 s
  of the trigger; plain-language automatic checks that lock unsafe options; live status of every agent with a follow-up button; phase and
  status computed by the server from the real state. It also runs the **Pengawas** (supervisor): every 60 s it reads the real WorkBuddy task
  state and restarts the *same* stalled task (max 3 per phase), switches model when one is saturated, then escalates to a human.

**Prompt design:** `skills/iso27001-assessment-workflow/SKILL.md` defines roles, phases, card catalogue and hard rules (e.g. rule 13 the
Manager never gives verdicts, rule 14 agents never change tools). Everything that matters is *also* enforced in code, because prompt rules
alone were broken in testing (see [TEST-RESULTS.md](TEST-RESULTS.md)).

Details and the trust-boundary diagram: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 4. Business value (measured in run ISO270001-16, 7 Nov 2026, 08:57–11:23 WIB)

- FASE 0–8 completed with **5 focus items, 18 evidence files, 5 clarification cards**, result **5 Minor NC / 0 Major NC**, report FINAL
  (5 artefacts) + CAP with a 90-day deadline.
- **6 emails/invitations really sent**, each with a Gmail message id. **2 items locked by the automatic checks** before anything ran
  (GATE-003: staff schedule already past; CALENDAR-016: internal system text in an invitation body) and GATE-002 rejected on purpose
  (test B03) — nothing was executed for any of them.
- Accountability tests passed: B03 (rejected gate → no task/email), H01 (ambiguous "Pak Pratama" → asks), H01b ("Pak Budi" → does not ask),
  time zone (Makassar WITA vs Friday prayer), B04 (salary question → exact out-of-scope sentence), H02 (embedded instruction ignored).
- Honest limits: 6 findings in run 16 (R16-F1…F6), 2 logged operator interventions — all listed in [TEST-RESULTS.md](TEST-RESULTS.md).

## 5. Repository map

| Path | Content |
|---|---|
| `skills/` | the three WorkBuddy skills (workflow, ISO knowledge base, report generator) |
| `tools/` | deterministic tools: outbox, evidence, integrity, audit, schedule, state, supervisor (Pengawas), wbstate, mailkey |
| `progress-dashboard/` | SIGAP dashboard server + page, automatic checks, Pengawas, panel guard, optional Discord bridge (config by environment variables only) |
| `data/mock/` | fictional company: contacts v5.4, permissions, operational rules (WIB/WITA, Friday prayer), scope, expected test results |
| `data/data-operation/` | the company document repository (118 fictional documents) — the only evidence source |
| `simulation/` | dataset preparation, manifest (sha256 of every Data-Operation file), staff personas |
| `runs/ISO270001-16/` | the complete state of test run 16: proposal, requests, outbox items, decision notes, assessment |
| `reports/ISO270001-16/` | FINAL deliverables of run 16: SoA, findings, Word report, presentation, audit log, CAP |
| `evidence/run16/` | screenshots of run 16 + the test protocol |
| `tests/` | validator and unit tests (supervisor 16/16, integrity 16/16, dashboard 7/7) |

## 6. Running it

Prototype requirements: Windows, Node.js 20+, Python 3.10+, WorkBuddy (started with `--remote-debugging-port=9333` so the dashboard server
can read task status and run the Pengawas), WorkBuddy connectors Gmail + Google Drive.

1. Put `data/data-operation/` where the staff tasks can read it (the prototype used `G:/My Drive/Hackathon_Tencent/Data-Operation`) and
   regenerate the manifest with `python -I simulation/prepare-dataset-v5.py`.
2. Install the skills from `skills/` into WorkBuddy.
3. Start the dashboard: `cd progress-dashboard && node server.js` → `http://127.0.0.1:4173`.
4. In a new WorkBuddy chat type **`mulai audit ISO 27001`**. The dashboard opens in the right panel; decide every card there.

The prototype uses absolute paths (`D:/Projects/hackathon_tencent`, `G:/My Drive/…`) in a few tools and skills; adjust them to your
checkout. Tests: `python -I tests/validate-v5.py`, `node tests/test-supervisor.js`, `node tests/test-integrity.js`, `node tests/test-dashboard-run.js`.

## 7. Notes on this public copy

- All people, the company and the documents are fictional. Email addresses are Gmail test aliases of the author's single test inbox.
- The name of one unrelated personal automation of the author was redacted in `runs/ISO270001-16/` and one screenshot; because outbox
  records are sealed by sha256, `AUTOMATION-026.json` no longer matches its original hash in this copy.
