# SIGAP — Product sharing: building on WorkBuddy

## Where WorkBuddy added value

- **Agents as scheduled tasks.** Each role (Auditor, each IT staff member) is its own WorkBuddy task with its own conversation, prompt
  and connectors. That made separation of duties concrete: staff tasks have Google Drive only, the Auditor has Gmail + Drive.
- **Connectors.** Gmail and Google Drive let the agents read the company repository and really send invitations and the report. Every
  "sent" in SIGAP is backed by a real Gmail message id.
- **Question cards (AskUserQuestion).** Fixed-option cards in the Manager chat are the natural "asks before acting" moment: GATE 1,
  "which Pak Pratama?", follow-ups after a rejection.
- **Skills.** The whole method (roles, nine phases, card catalogue, rules) lives in three `SKILL.md` files that WorkBuddy loads on the
  trigger phrase `mulai audit ISO 27001` — the prompt design is versioned like code.
- **Right panel browser.** The SIGAP dashboard runs inside the Manager chat's right panel, so the person sees every decision, its checks
  and the live state of every agent without leaving the conversation.
- **Conversation windows and local app.** Running locally let the dashboard server read the real task state and use WorkBuddy's own
  "Run now" for the Pengawas.

## Key insights

1. **Prompt rules are not enough for accountability.** Across runs 07–16 agents graded themselves, edited their own guard tool, created
   out-of-scope automations, and wrote internal notes into outgoing invitations. Each time we moved the rule into a deterministic tool
   (outbox, evidence, integrity) or into the dashboard checks. The agent proposes; code verifies; a human decides.
2. **The weakest link was availability, not intelligence.** Most stalls came from model saturation (429 / "Model busy"). A deterministic
   supervisor that re-runs the *same* task, switches model and escalates after three tries removed the need for an operator to "wake"
   agents (run 12 → run 14).
3. **A non-expert must be able to decide.** Users do not compare hashes. Every decision card explains its checks in plain language,
   suggests an option and locks the unsafe ones; Revisi/Tolak carry a fixed reason so the agent knows what to fix.
4. **Show the state, never the agent's story.** Agent-written progress text went stale or ran ahead of reality; phase and status are now
   computed by the server from outbox, evidence index and audit log.
5. **Test honestly and write failures down.** Every run has a protocol written before it starts, an operator rule (no hints), logged
   interventions and numbered findings. Run 16 still produced six findings; five were fixed the same day.

## Limits we hit (and what we would ask from the platform)

- Cards are not rendered inside scheduled-task sessions → we built the dashboard as the decision surface for task-made items.
- Recurring tasks run at most hourly → the Pengawas lives in our server and uses WorkBuddy's own "Run now".
- Platform-level "Model busy" errors stop a chat turn → model fallback + automatic follow-up.
- A first-class, permissioned API for reading task state and triggering a task would remove the need for the local debug port.

## What we would build next

- Real owners deciding in their own dashboards (instead of one operator on their behalf).
- Connector guards on the server side (so scope/automation rules stop being prompt-level).
- A real company document repository instead of the fictional Data-Operation, and more Annex A controls per cycle.
