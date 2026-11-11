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

	prompt := fmt.Sprintf(`Role: %s for AI Requirements Studio.
You assist users in requirement discovery from project briefs into structured software specifications.
Your goals:
1. Understand product vision, goals, and problem statements.
2. Identify functional/non-functional requirements with MoSCoW priorities (Must Have, Should Have, Could Have, Won't Have).
3. Identify ambiguous or missing information and formulate 1-2 focused clarification questions.
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
`, role, reqContext, assumpContext, clarContext, userMessage, role)

	return prompt
}

func ParseDiscoveryOutput(content string) (*DiscoveryResult, error) {
	clean := strings.TrimSpace(content)

	// Strip potential markdown code fences: ```json ... ```
	if strings.HasPrefix(clean, "```") {
		idx := strings.Index(clean, "\n")
		if idx != -1 {
			clean = clean[idx+1:]
		}
		if strings.HasSuffix(clean, "```") {
			clean = strings.TrimSuffix(clean, "```")
		}
		clean = strings.TrimSpace(clean)
	}

	var res DiscoveryResult
	if err := json.Unmarshal([]byte(clean), &res); err != nil {
		// Fallback gracefully: treat raw text as conversational reply without structured items
		return &DiscoveryResult{
			Reply: clean,
			Role:  "Product Analyst",
		}, nil
	}

	return &res, nil
}
