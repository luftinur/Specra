# Implementation Plan: Skills UX Refinement & Right Inspector Interactive Wiring

Technical planning document addressing:
1. **Origin of Skills & AI Prompt Injection Mechanism**
2. **Refactoring Personas & Skills UX in Settings Modal** (Display only active skills, add "+ Add Skill to Persona" dropdown, and detach actions)
3. **Audit & Interactive Wiring of Right Inspector** (Requirements actions, Validation, Traceability, Assumptions, Clarifications, and Auto/Manual Extraction)

---

## 1. Architectural Analysis: Origin & Application of Skills

### A. Origin of Skills
Skills in **Specra** originate from two sources:
1. **Built-in Skills Catalog (16 Built-in Skills)**:
   - Statically declared in the Go backend: [`internal/ai/agent_registry.go`](file:///E:/dev-agent-assistant/internal/ai/agent_registry.go).
   - Grouped into 4 domain categories:
     - **Product Analyst (4 skills)**: `product-discovery`, `user-story-mapping`, `moscow-prioritization`, `business-kpi-definition`.
     - **System Analyst (4 skills)**: `ieee-830-specification`, `functional-flow-modeling`, `traceability-verification`, `non-functional-sla-definition`.
     - **Software Architect (4 skills)**: `c4-architecture-modeling`, `api-contract-engineering`, `security-threat-modeling`, `scalability-fault-tolerance`.
     - **UI/UX Agent (4 skills)**: `semantic-design-tokens`, `atomic-component-hierarchy`, `mermaid-screen-flows`, `wcag-accessibility-audit`.
2. **Custom Skills (User-Authored Skills)**:
   - Authored by users via the *"Create New Custom Skill"* dialog.
   - Stored in SQLite `app_settings` under key `"custom_skills"`.
   - Feature custom prompt directives (e.g. *"Fintech OJK Compliance"*, *"HIPAA Medical Privacy"*, *"ISO 27001 Security"*).

### B. How Skills are Applied to AI
- Each persona (`domain.AgentConfig`) maintains an array `Skills []string` of assigned skill IDs.
- When messages are dispatched ([`ConversationService.SendMessageWithAgent`](file:///E:/dev-agent-assistant/internal/services/conversation_service.go)):
  ```go
  skills := s.agentRegistry.GetSkillsForAgent(agentID)
  if len(skills) > 0 {
      var skillDirectives []string
      for _, sk := range skills {
          if sk.Prompt != "" {
              skillDirectives = append(skillDirectives, fmt.Sprintf("- [%s]: %s", sk.Name, sk.Prompt))
          }
      }
      systemDirective += "\n\nACTIVE SPECIALIZED SKILLS & FRAMEWORKS:\n" + strings.Join(skillDirectives, "\n")
  }
  ```
- Directives are injected into LLM system instructions, enforcing targeted methodologies.

---

## 2. UX Refactor: Settings Modal (Specialist Personas Tab)

- **Eliminate Clutter**: Instead of rendering 16 cards (with 12 marked disabled), render **Active Skills Only** for the selected persona.
- **"+ Add Skill to Persona" Dropdown**:
  - Lists unassigned skills categorized by domain (*Product*, *System*, *Architecture*, *UI/UX*, *Custom*).
  - Selecting an option attaches the skill immediately.
  - Quick action: `+ Create Custom Skill...`.
- **Detach Action (`X`)**: Quick removal action on each active card.
- **Custom Skills Library Section**: Dedicated lower management panel to edit and delete user-authored skills.

---

## 3. Right Inspector Audit & Interactive Wiring

| Inspector Tab | Backend Data Source | Project Context Connected? | Functional State |
|---|---|---|---|
| **Requirements** | `RequirementService.ListRequirements(projectID)` | **Yes** (SQLite `requirements`) | ⚠️ **Read-Only**: Needs interactive Approve/Reject and MoSCoW priority toggles. |
| **Validation** | `ValidationService.GetLatestFindings(projectID)` & `RunValidation` | **Yes** (PRD 20 sec, SRS 22 sec, orphan reqs, outdated SRS) | **Fully Functional**: Real validation execution and finding reporting. |
| **Traceability** | `ValidationService.GetTraceabilityMatrix(projectID)` | **Yes** (PRD requirements mapped to SRS) | **Fully Functional**: Displays Mapped vs Orphan requirements. |
| **Assumptions** | `ConversationService.ListAssumptions(projectID)` | **Yes** (SQLite `assumptions`) | ⚠️ **Read-Only**: Needs interactive Confirm/Reject actions. |
| **Questions** | `ConversationService.ListClarifications(projectID)` | **Yes** (SQLite `clarifications`) | ⚠️ **Read-Only**: Needs inline input for user answers. |

### Enhancements:
1. **Interactive Requirement Cards**: Add quick Approve/Reject buttons and MoSCoW dropdowns (`Must`, `Should`, `Could`, `Won't`).
2. **Clarification Answer Forms**: Inline text inputs for unanswered questions with `Save Answer` actions.
3. **Assumption Status Toggles**: `Confirm Fact` and `Reject` buttons.
4. **"Extract Requirements" Action**: Header button to manually trigger extraction from active briefs.

---

## 4. Proposed Changes

### Component 1: Settings Modal (`frontend/src/App.tsx`)
- Render active skills cleanly with detach buttons.
- Implement "+ Add Skill to Persona" popover dropdown.
- Dedicated Custom Skills management list.

```tsx
<div className="relative">
  <button
    type="button"
    onClick={() => setShowAddSkillDropdown(!showAddSkillDropdown)}
    className="px-3 py-1.5 bg-primary-soft text-primary hover:bg-primary/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
  >
    <Plus size={13} />
    <span>+ Add Skill to Persona</span>
    <ChevronDown size={13} />
  </button>
  {showAddSkillDropdown && (
    <div className="absolute right-0 top-full mt-1.5 w-72 bg-surface border border-border rounded-xl shadow-xl p-1.5 z-30 max-h-64 overflow-y-auto">
      {unattachedSkills.map(sk => (
        <button
          key={sk.id}
          onClick={() => handleAddSkillToAgent(currentAgent, sk.id)}
          className="w-full text-left p-2 rounded-lg hover:bg-fill flex flex-col gap-0.5 text-xs"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-fg">{sk.name}</span>
            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-fill font-mono text-muted">{sk.category}</span>
          </div>
          <span className="text-[11px] text-muted line-clamp-1">{sk.description}</span>
        </button>
      ))}
    </div>
  )}
</div>
```

---

### Component 2: Right Inspector (`frontend/src/App.tsx`)
- **Requirements Tab**:
  - `Approve` (`Check`, emerald) and `Reject` (`X`, rose) buttons.
  - MoSCoW Priority selector invoking `RequirementService.UpdatePriority`.
  - `+ Extract Requirements` header button.
- **Assumptions Tab**:
  - `Confirm` and `Reject` buttons invoking `RequirementService.UpdateAssumptionStatus`.
- **Clarifications Tab**:
  - Inline input and `Save Answer` action invoking `RequirementService.AnswerClarification`.

---

## 5. Verification Plan

### Automated Tests
1. Frontend compilation: `npm --prefix frontend run build` (0 errors).
2. Backend tests: `go test -v ./internal/...` (100% PASS).
3. Desktop build: `wails3 task build`.

### Manual Verification
1. **Skills UI**: Open Settings > Specialist Personas; verify clean active skill cards and functional Add Skill dropdown.
2. **Right Inspector**:
   - Approve a requirement; verify green badge updates instantly.
   - Change MoSCoW priority; verify immediate persistence.
   - Answer clarification question; verify status transitions to `answered`.
   - Confirm assumption; verify status updates to `confirmed`.
