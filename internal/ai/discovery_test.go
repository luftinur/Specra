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

	// 5. OpenCode CLI scenario: Conversational preamble + markdown code fence + postamble
	opencodeOutput := `Tentu! Berikut adalah hasil analisis awal kebutuhan Anda:

` + "```json\n" + rawJSON + "\n```" + `

Semoga hasil analisis ini bermanfaat. Silakan tanyakan jika ada penyesuaian!`

	res4, err := ParseDiscoveryOutput(opencodeOutput)
	if err != nil {
		t.Fatalf("failed to parse OpenCode output with preamble: %v", err)
	}
	if res4.Reply != "I have analyzed your courier requirement." {
		t.Errorf("expected reply extracted from JSON, got %q", res4.Reply)
	}
	if len(res4.Requirements) != 1 || res4.Requirements[0].Key != "REQ-002" {
		t.Errorf("expected extracted requirement REQ-002, got: %+v", res4.Requirements)
	}

	// 6. OpenCode CLI scenario: Conversational preamble + raw braces without fence
	rawBracesOutput := `Analisis cepat:
` + rawJSON + `
Silakan verifikasi kebutuhan di atas.`

	res5, err := ParseDiscoveryOutput(rawBracesOutput)
	if err != nil {
		t.Fatalf("failed to parse raw braces output: %v", err)
	}
	if res5.Reply != "I have analyzed your courier requirement." {
		t.Errorf("expected reply extracted from JSON, got %q", res5.Reply)
	}
	if len(res5.Requirements) != 1 {
		t.Errorf("expected requirements count 1, got %d", len(res5.Requirements))
	}

	// 7. TOON Format Input parsing
	toonSample := `reply: Halo, ini hasil analisis dalam format TOON yang hemat token.
role: Product Analyst
requirements[1]{key,category,title,description,priority,confidence}:
  REQ-101,functional,Cart Checkout,User can checkout with credit card,Must Have,high
`
	res6, err := ParseDiscoveryOutput(toonSample)
	if err != nil {
		t.Fatalf("failed to parse TOON discovery output: %v", err)
	}
	if len(res6.Requirements) != 1 || res6.Requirements[0].Key != "REQ-101" {
		t.Errorf("unexpected TOON requirement: %+v", res6.Requirements)
	}
	if res6.Reply != "Halo, ini hasil analisis dalam format TOON yang hemat token." {
		t.Errorf("unexpected TOON reply: %s", res6.Reply)
	}
}
