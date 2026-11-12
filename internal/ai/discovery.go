package ai

import (
	"encoding/json"
	"fmt"
	"strings"

	"ai-requirements-studio/internal/domain"
)

type DiscoveryRequirement struct {
	Key         string `json:"key"`
	Category    string `json:"category"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    string `json:"priority"`
	Confidence  string `json:"confidence"`
}

type DiscoveryClarification struct {
	Question string `json:"question"`
}

type DiscoveryAssumption struct {
	Description string `json:"description"`
}

type DiscoveryResult struct {
	Reply          string                   `json:"reply"`
	Role           string                   `json:"role"`
	Requirements   []DiscoveryRequirement   `json:"requirements"`
	Clarifications []DiscoveryClarification `json:"clarifications"`
	Assumptions    []DiscoveryAssumption    `json:"assumptions"`
}

func BuildDiscoveryPrompt(
	role string,
	userMessage string,
	existingReqs []domain.Requirement,
	existingAssumptions []domain.Assumption,
	existingClarifications []domain.Clarification,
) string {
	if role == "" {
		role = "Product Analyst"
	}

	reqContext := ""
	if len(existingReqs) > 0 {
		reqContext = "Existing Confirmed Requirements:\n"
		for _, r := range existingReqs {
			reqContext += fmt.Sprintf("- [%s] (%s) %s: %s (Priority: %s)\n", r.RequirementKey, r.Category, r.Title, r.Description, r.Priority)
		}
	}

	assumpContext := ""
	if len(existingAssumptions) > 0 {
		assumpContext = "Existing Assumptions:\n"
		for _, a := range existingAssumptions {
			assumpContext += fmt.Sprintf("- (%s) %s\n", a.Status, a.Description)
		}
	}

	clarContext := ""
	if len(existingClarifications) > 0 {
		clarContext = "Existing Clarification Items:\n"
		for _, c := range existingClarifications {
			ans := "Pending Answer"
			if c.Answer != nil {
				ans = *c.Answer
			}
			clarContext += fmt.Sprintf("- Q: %s | Answer: %s\n", c.Question, ans)
		}
	}

	modeDirectives := "INTERACTION MODE: DISCOVERY (Proactively identify gaps, detect ambiguities, and formulate 1-3 targeted clarification questions)."
	if strings.Contains(userMessage, "[MODE: EXECUTION]") {
		modeDirectives = "INTERACTION MODE: EXECUTION (Pasif & eksekutorial. Do NOT ask clarification questions - leave clarifications empty []. Synthesize all confirmed requirements and provide direct, actionable specifications)."
	}

	webRefDirectives := ""
	if strings.Contains(userMessage, "http://") || strings.Contains(userMessage, "https://") {
		webRefDirectives = "\nWEB REFERENCE HARNESSING: External URLs or web design references detected in user message. Analyze and harness the visual patterns, color palette tokens, typography, and atomic layout conventions from these references into the requirements and design constraints.\n"
	}

	prompt := fmt.Sprintf(`Role: %s for Specra (AI Requirements Engineering Studio).
You assist users in requirement discovery from project briefs into structured software specifications.
%s
%s

CRITICAL DOMAIN ISOLATION & SPECIFICATION RULES:
1. Analyze exclusively the USER's specific product, problem domain, and business requirements from their input.
2. STRICT ZERO-LEAKAGE: Do NOT mention, assume, or inject internal developer tools, framework references (such as MQ-Studio, dev assistants, or Specra itself) into the requirements, personas, or specifications unless the user's prompt explicitly asks to build them.
3. Keep all requirements, user personas, user stories, and workflows 100%% centered around the user's business domain.
4. Do NOT repeat or re-ask questions that already exist in 'Existing Clarification Items' (especially answered ones). Only formulate fresh, new clarification questions if critical requirements are ambiguous.

Your goals:
1. Understand product vision, goals, and problem statements.
2. Identify functional/non-functional requirements with MoSCoW priorities (Must Have, Should Have, Could Have, Won't Have).
3. If in Discovery Mode, identify ambiguous or missing information and formulate 1-2 focused clarification questions. If in Execution Mode, provide direct answers without asking questions.
4. Detect unconfirmed assumptions.
5. Provide a friendly conversational analysis summary.

%s
%s
%s

User's Latest Input:
"%s"

OUTPUT FORMAT REQUIREMENT:
You must reply ONLY with a valid JSON object matching this schema:
{
  "reply": "Conversational reply explaining your analysis to the user",
  "role": "%s",
  "requirements": [
    {
      "key": "REQ-001",
      "category": "functional",
      "title": "Short title",
      "description": "Clear, verifiable requirement statement",
      "priority": "Must Have",
      "confidence": "high"
    }
  ],
  "clarifications": [
    {
      "question": "Specific question to clarify scope or technical behavior"
    }
  ],
  "assumptions": [
    {
      "description": "Unconfirmed assumption made during this analysis"
    }
  ]
}
`, role, modeDirectives, webRefDirectives, reqContext, assumpContext, clarContext, userMessage, role)

	return prompt
}

func ParseDiscoveryOutput(content string) (*DiscoveryResult, error) {
	clean := strings.TrimSpace(content)
	if clean == "" {
		return &DiscoveryResult{Reply: ""}, nil
	}

	// 1. Direct JSON unmarshal attempt (fast path for strict JSON CLI like antigravity)
	var res DiscoveryResult
	if err := json.Unmarshal([]byte(clean), &res); err == nil && (res.Reply != "" || len(res.Requirements) > 0) {
		return &res, nil
	}

	// 2. Extract JSON from markdown code fence anywhere in the output: ```json ... ``` or ``` ... ```
	// This directly fixes OpenCode CLI responses that include conversational preambles/postambles.
	fenceStart := strings.Index(clean, "```")
	if fenceStart != -1 {
		firstNewline := strings.Index(clean[fenceStart:], "\n")
		if firstNewline != -1 {
			bodyStart := fenceStart + firstNewline + 1
			fenceEnd := strings.Index(clean[bodyStart:], "```")
			if fenceEnd != -1 {
				jsonCandidate := strings.TrimSpace(clean[bodyStart : bodyStart+fenceEnd])
				var fenceRes DiscoveryResult
				if err := json.Unmarshal([]byte(jsonCandidate), &fenceRes); err == nil {
					// If model omitted inner reply, adopt outer preamble as conversational reply
					if fenceRes.Reply == "" && fenceStart > 0 {
						fenceRes.Reply = strings.TrimSpace(clean[:fenceStart])
					}
					return &fenceRes, nil
				}
			}
		}
	}

	// 3. Extract JSON by outermost bracket matching '{' ... '}'
	// Handles outputs with conversational text before/after raw JSON without markdown fences.
	firstBrace := strings.Index(clean, "{")
	lastBrace := strings.LastIndex(clean, "}")
	if firstBrace != -1 && lastBrace > firstBrace {
		jsonCandidate := strings.TrimSpace(clean[firstBrace : lastBrace+1])
		var braceRes DiscoveryResult
		if err := json.Unmarshal([]byte(jsonCandidate), &braceRes); err == nil {
			if braceRes.Reply == "" && firstBrace > 0 {
				preamble := strings.TrimSpace(clean[:firstBrace])
				preamble = strings.TrimSuffix(preamble, "```json")
				preamble = strings.TrimSuffix(preamble, "```")
				braceRes.Reply = strings.TrimSpace(preamble)
			}
			return &braceRes, nil
		}
	}

	// 4. Support TOON (Token-Oriented Object Notation) decoded discovery
	if strings.Contains(clean, "requirements[") || strings.Contains(clean, "reply:") {
		if toonRes, err := DecodeTOONDiscovery(clean); err == nil && (toonRes.Reply != "" || len(toonRes.Requirements) > 0) {
			return toonRes, nil
		}
	}

	// 5. Fallback: treat entire clean text as conversational reply without crashing
	return &DiscoveryResult{
		Reply: clean,
		Role:  "Product Analyst",
	}, nil
}
