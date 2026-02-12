---
trigger: always_on
---

# Phase Execution Agent Protocol

## Purpose

This document defines how an autonomous implementation agent must execute **exactly one phase at a time** from the TaskFlow Implementation Plan.

The agent must:

1. Identify the next incomplete phase.
2. Plan that phase.
3. Implement only that phase.
4. Verify and test it.
5. Mark it complete in the Implementation Plan.
6. STOP.

The human operator will review the results. The agent will be run again afterward to continue with the next phase.

---

# Global Operating Rules

## 1. Single-Phase Rule

The agent MUST complete only the next unchecked phase.

* Do NOT start multiple phases.
* Do NOT "optimize ahead".
* Do NOT partially begin the following phase.
* Do NOT refactor unrelated parts of the codebase.

When the current phase is complete and verified, the agent MUST stop.

---

## 2. Source of Truth

The authoritative execution order is defined in:

* `TaskFlow_Implementation_Plan.md`

Additional authoritative documents the agent MUST use for context, constraints, and clarification:

* `TaskFlow_PRD.md`
* `TaskFlow_TechStack_Spec.md`

The Implementation Plan defines execution order.
The PRD defines product behavior and user expectations.
The Technical Stack Specification defines architectural, dependency, and structural constraints.

If ambiguity exists in the Implementation Plan, the agent must consult the PRD and Tech Stack Spec before making decisions.

The agent must:

* Parse the Implementation Plan to determine order.
* Reference the PRD for behavioral correctness.
* Reference the Tech Stack Spec for architectural compliance.
* Locate the first phase or feature not marked complete.
* Treat that as the target phase.

If everything is marked complete, the agent must stop and report that no remaining work exists.

---

# Execution Workflow

The following workflow must be followed exactly and in order.

---

## STEP 1 — Identify Target Phase

1. Open `TaskFlow_Implementation_Plan.md`.
2. Locate the first phase/feature not marked as complete.
3. Confirm all prior phases are fully completed.
4. Output:

   * Phase name
   * Features included
   * Acceptance criteria

If prerequisites are missing, STOP and report the inconsistency.

---

## STEP 2 — Produce Phase Plan

Before writing any implementation code, the agent must produce a brief but concrete execution plan including:

* Files to modify
* New files to create
* Store mutations required
* Components affected
* Data model changes (if any)
* Edge cases to handle
* Acceptance criteria mapping to implementation
* Test strategy

The plan must be specific enough that implementation can be performed deterministically.

Only after the plan is internally consistent may implementation begin.

---

## STEP 3 — Implement Phase

Implementation rules:

* Modify only files relevant to the target phase.
* Do not introduce new dependencies beyond those allowed in the Tech Stack Spec.
* Follow the Technical Stack Specification strictly.
* Ensure behavior matches the PRD.
* Maintain mutation-through-store pattern.
* Persist state through the defined persistence pipeline.
* Maintain theme and UI consistency.
* Avoid breaking existing completed features.

### Feature-Level Git Commit Requirement

Within a phase, each feature must be implemented and committed separately.

For every feature inside the phase:

1. Implement the feature fully.
2. Verify it meets its acceptance criteria.
3. Run regression checks.
4. Create a git commit before starting the next feature.

Commit rules:

* One commit per feature.

* Use clear, structured commit messages:

  ```
  feat(phase-X): implement Feature X.Y - <short description>
  ```

* Do NOT batch multiple features into a single commit.

* Do NOT commit partial implementations.

After all features in the phase are complete, the phase will then be marked complete in the Implementation Plan (STEP 5).

The implementation must satisfy all acceptance criteria defined for the phase.

---

## STEP 4 — Verification & Testing

After implementation, the agent must verify correctness.

### 4.1 Functional Verification

For each acceptance criterion:

* Provide a short explanation of how the implementation satisfies it.

### 4.2 Regression Check

Confirm:

* No previously completed features were modified unintentionally.
* State persistence still works.
* No console errors introduced.
* No schema changes broke hydration.

### 4.3 Edge Case Review

Explicitly verify:

* Empty state behavior
* Rapid user interaction behavior (e.g., double-click, fast drag)
* Invalid user input handling

If any test fails, fix within the same phase before proceeding.

---

## STEP 5 — Mark Phase Complete

Once verification passes:

1. Open `TaskFlow_Implementation_Plan.md`.
2. Mark the completed phase and its features as complete.

   * Use a clear indicator such as:

     * `[x] Phase 2: Kanban Task Lifecycle`
     * Or add `Status: Complete`
3. Do NOT modify future phases.

---

## STEP 6 — STOP

After marking the phase complete, the agent MUST:

* Output a completion summary.
* List modified files.
* Confirm acceptance criteria satisfied.
* Confirm no further changes were made.
* STOP execution.

The agent must not begin the next phase.

---

# Idempotent Re-Execution Behavior

When the agent is run again:

1. It must re-open the Implementation Plan.
2. It must detect completed phases.
3. It must select the next incomplete phase.
4. It must repeat the full workflow from STEP 1.

The agent must never assume prior memory beyond the current repository state.

---

# Failure Handling Rules

If any of the following occur, STOP and report:

* Implementation Plan is missing or unreadable.
* Phase ordering is ambiguous.
* Required previous phase is incomplete.
* Technical constraints conflict with phase requirements.
* Schema migration would break existing persisted data.

Never "guess" a resolution.

---

# Definition of Done (Per Phase)

A phase is considered complete only if:

* All listed features are implemented.
* All acceptance criteria are satisfied.
* No console errors exist.
* Persistence works.
* No regressions detected.
* The phase is marked complete in the plan.
* The agent has STOPPED.

---

# Strict Prohibitions

The agent MUST NOT:

* Implement multiple phases at once.
* Modify unrelated code.
* Redesign architecture mid-stream.
* Skip verification.
* Continue after marking completion.
* Leave partial implementations.

---

# Execution Summary Template

At the end of a successful phase, output:

```
PHASE COMPLETED: <Phase Name>

Files Modified:
- fileA.js
- fileB.js

Files Created:
- fileC.js

Acceptance Criteria Verification:
- Criterion 1 → satisfied by ...
- Criterion 2 → satisfied by ...

Regression Check:
- No prior features affected
- Persistence verified
- No console errors

Status:
- Phase marked complete in TaskFlow_Implementation_Plan.md
- Agent stopped
```

---

End of Protocol.
