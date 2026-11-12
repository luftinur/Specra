package ai

import (
	"encoding/json"
	"testing"

	"ai-requirements-studio/internal/domain"
)

func TestTOON_EncodeAndDecode(t *testing.T) {
	sample := &DiscoveryResult{
		Reply: "Saya telah menganalisis kebutuhan inventaris gudang Anda.",
		Role:  "Product Analyst",
		Requirements: []DiscoveryRequirement{
			{
				Key:         "REQ-001",
				Category:    "functional",
				Title:       "Stock Inbound Tracking",
				Description: "Petugas gudang dapat memindai barcode barang masuk",
				Priority:    "Must Have",
				Confidence:  "high",
			},
			{
				Key:         "REQ-002",
				Category:    "functional",
				Title:       "Low Stock Alert",
				Description: "Notifikasi otomatis saat stok mencapai batas minimum",
				Priority:    "Should Have",
				Confidence:  "high",
			},
			{
				Key:         "REQ-003",
				Category:    "non-functional",
				Title:       "Response Time Sub-second",
				Description: "Pencarian SKU memakan waktu kurang dari 500ms",
				Priority:    "Must Have",
				Confidence:  "high",
			},
		},
		Clarifications: []DiscoveryClarification{
			{Question: "Apakah integrasi pemindai barcode menggunakan scanner Bluetooth genggam atau kamera HP?"},
		},
		Assumptions: []DiscoveryAssumption{
			{Description: "Koneksi jaringan gudang lokal memiliki akses LAN stabil"},
		},
	}

	// 1. Encode to TOON
	toonOut := EncodeDiscoveryToTOON(sample)
	if toonOut == "" {
		t.Fatalf("expected non-empty TOON output")
	}

	// 2. Decode back from TOON
	decoded, err := DecodeTOONDiscovery(toonOut)
	if err != nil {
		t.Fatalf("failed to decode TOON: %v", err)
	}

	if decoded.Reply != sample.Reply {
		t.Errorf("expected reply %q, got %q", sample.Reply, decoded.Reply)
	}
	if len(decoded.Requirements) != 3 {
		t.Fatalf("expected 3 requirements, got %d", len(decoded.Requirements))
	}
	if decoded.Requirements[0].Key != "REQ-001" || decoded.Requirements[0].Priority != "Must Have" {
		t.Errorf("first requirement mismatch: %+v", decoded.Requirements[0])
	}
	if len(decoded.Clarifications) != 1 || decoded.Clarifications[0].Question != sample.Clarifications[0].Question {
		t.Errorf("clarification mismatch: %+v", decoded.Clarifications)
	}
	if len(decoded.Assumptions) != 1 || decoded.Assumptions[0].Description != sample.Assumptions[0].Description {
		t.Errorf("assumption mismatch: %+v", decoded.Assumptions)
	}

	// 3. Measure Token & Byte Savings vs JSON
	jsonBytes, _ := json.MarshalIndent(sample, "", "  ")
	jsonStr := string(jsonBytes)

	jsonTokens, toonTokens, savings := CalculateTokenSavings(jsonStr, toonOut)

	t.Logf("\n--- TOON TOKEN SAVINGS REPORT ---\nJSON Chars: %d (~%d tokens)\nTOON Chars: %d (~%d tokens)\nSavings: %.2f%%\n--------------------------------",
		len(jsonStr), jsonTokens, len(toonOut), toonTokens, savings)

	// Ensure substantial token reduction (> 30%)
	if savings < 30.0 {
		t.Errorf("expected at least 30%% token savings with TOON, got %.2f%%", savings)
	}
}

func TestEncodeRequirementsToTOON(t *testing.T) {
	reqs := []domain.Requirement{
		{RequirementKey: "REQ-001", Category: "functional", Title: "Login", Priority: domain.PriorityMustHave},
		{RequirementKey: "REQ-002", Category: "non-functional", Title: "Latency", Priority: domain.PriorityShouldHave},
	}

	out := EncodeRequirementsToTOON(reqs)
	if out == "" {
		t.Fatalf("expected non-empty TOON string")
	}
	t.Logf("Encoded Requirements in TOON:\n%s", out)
}
