package ai

import (
	"testing"

	"ai-requirements-studio/internal/domain"
)

func TestDiscoveryPromptAndParse(t *testing.T) {
	// 1. Build prompt
	reqs := []domain.Requirement{
		{RequirementKey: "REQ-001", Category: "functional", Title: "Payment", Description: "QRIS support", Priority: domain.PriorityMustHave},
	}
	assump := []domain.Assumption{
		{Status: "unconfirmed", Description: "Local delivery only"},
	}
	clar := []domain.Clarification{
		{Question: "Guest checkout allowed?"},
	}

	prompt := BuildDiscoveryPrompt("Product Analyst", "We want courier delivery", reqs, assump, clar)
	if prompt == "" {
		t.Fatalf("expected non-empty prompt")
	}

	// 2. Parse Valid JSON output
	rawJSON := `{
		"reply": "I have analyzed your courier requirement.",
		"role": "Product Analyst",
		"requirements": [
			{
				"key": "REQ-002",
				"category": "functional",
				"title": "Courier Tracking",
				"description": "Provide live driver status",
				"priority": "Must Have",
				"confidence": "high"
			}
		],
		"clarifications": [
			{"question": "Do you need third-party courier webhook integration?"}
		],
		"assumptions": [
			{"description": "Drivers have smartphone GPS"}
		]
	}`

	res, err := ParseDiscoveryOutput(rawJSON)
	if err != nil {
		t.Fatalf("failed to parse valid JSON: %v", err)
	}
	if len(res.Requirements) != 1 || res.Requirements[0].Key != "REQ-002" {
		t.Errorf("unexpected requirements: %+v", res.Requirements)
	}
	if len(res.Clarifications) != 1 || len(res.Assumptions) != 1 {
		t.Errorf("unexpected clarifications or assumptions count")
	}

	// 3. Parse Markdown-wrapped JSON output (```json ... ```)
	wrapped := "```json\n" + rawJSON + "\n```"
	res2, err := ParseDiscoveryOutput(wrapped)
	if err != nil {
		t.Fatalf("failed to parse wrapped JSON: %v", err)
	}
	if res2.Reply != "I have analyzed your courier requirement." {
		t.Errorf("unexpected reply: %s", res2.Reply)
	}

	// 4. Fallback on non-JSON text
	plain := "Hello, I can help you define requirements."
	res3, err := ParseDiscoveryOutput(plain)
	if err != nil {
		t.Fatalf("expected no error on fallback: %v", err)
	}
	if res3.Reply != plain {
		t.Errorf("expected plain text reply, got %s", res3.Reply)
	}
}
