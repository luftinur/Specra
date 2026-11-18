package ai

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strings"

	"ai-requirements-studio/internal/domain"
)

/**
 * TOON (Token-Oriented Object Notation) - Lightweight Go Implementation
 * Based on the specification at https://toonformat.dev & https://github.com/toon-format/toon
 *
 * TOON optimizes structured data serialization for LLM prompts by combining:
 * 1. YAML-style indentation for key-value scalar fields
 * 2. CSV-style tabular layout for uniform arrays (header definitions with count and fields)
 *
 * This eliminates repeating keys across array items and quotes, reducing token usage by 30%-60%.
 */

// EncodeDiscoveryToTOON serializes a DiscoveryResult into compact TOON format.
func EncodeDiscoveryToTOON(res *DiscoveryResult) string {
	if res == nil {
		return ""
	}

	var sb strings.Builder

	// 1. Scalar fields
	if res.Reply != "" {
		sb.WriteString(fmt.Sprintf("reply: %s\n", sanitizeTOONString(res.Reply)))
	}
	if res.Role != "" {
		sb.WriteString(fmt.Sprintf("role: %s\n", sanitizeTOONString(res.Role)))
	}

	// 2. Uniform Array: requirements[N]{key,category,title,description,priority,confidence}:
	if len(res.Requirements) > 0 {
		sb.WriteString(fmt.Sprintf("requirements[%d]{key,category,title,description,priority,confidence}:\n", len(res.Requirements)))
		for _, r := range res.Requirements {
			row := formatCSVRow([]string{r.Key, r.Category, r.Title, r.Description, r.Priority, r.Confidence})
			writeTOONRow(&sb, row)
		}
	}

	// 3. Uniform Array: clarifications[N]{question}:
	if len(res.Clarifications) > 0 {
		sb.WriteString(fmt.Sprintf("clarifications[%d]{question}:\n", len(res.Clarifications)))
		for _, c := range res.Clarifications {
			row := formatCSVRow([]string{c.Question})
			writeTOONRow(&sb, row)
		}
	}

	// 4. Uniform Array: assumptions[N]{description}:
	if len(res.Assumptions) > 0 {
		sb.WriteString(fmt.Sprintf("assumptions[%d]{description}:\n", len(res.Assumptions)))
		for _, a := range res.Assumptions {
			row := formatCSVRow([]string{a.Description})
			writeTOONRow(&sb, row)
		}
	}

	return strings.TrimSpace(sb.String())
}

// DecodeTOONDiscovery parses a TOON formatted string into a DiscoveryResult.
func DecodeTOONDiscovery(toonStr string) (*DiscoveryResult, error) {
	lines := strings.Split(toonStr, "\n")
	res := &DiscoveryResult{
		Role:           "Product Analyst",
		Requirements:   make([]DiscoveryRequirement, 0),
		Clarifications: make([]DiscoveryClarification, 0),
		Assumptions:    make([]DiscoveryAssumption, 0),
	}

	var currentSection string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "#") {
			continue
		}

		// Detect Section Headers: name[count]{fields}:
		if strings.Contains(trimmed, "[") && strings.Contains(trimmed, "{") && strings.HasSuffix(trimmed, ":") {
			nameEnd := strings.Index(trimmed, "[")
			currentSection = strings.TrimSpace(trimmed[:nameEnd])
			continue
		}

		// Detect Top-level Scalars: key: value
		if !strings.HasPrefix(line, "  ") && !strings.HasPrefix(line, "\t") && strings.Contains(trimmed, ":") && !strings.HasSuffix(trimmed, ":") {
			colonIdx := strings.Index(trimmed, ":")
			key := strings.TrimSpace(trimmed[:colonIdx])
			val := strings.TrimSpace(trimmed[colonIdx+1:])
			switch key {
			case "reply":
				res.Reply = val
			case "role":
				res.Role = val
			}
			currentSection = ""
			continue
		}

		// Row Data under active section
		if currentSection != "" && (strings.HasPrefix(line, "  ") || strings.HasPrefix(line, "\t")) {
			fields, err := parseCSVRow(trimmed)
			if err != nil || len(fields) == 0 {
				continue
			}

			switch currentSection {
			case "requirements":
				req := DiscoveryRequirement{}
				if len(fields) > 0 {
					req.Key = fields[0]
				}
				if len(fields) > 1 {
					req.Category = fields[1]
				}
				if len(fields) > 2 {
					req.Title = fields[2]
				}
				if len(fields) > 3 {
					req.Description = fields[3]
				}
				if len(fields) > 4 {
					req.Priority = fields[4]
				}
				if len(fields) > 5 {
					req.Confidence = fields[5]
				}
				res.Requirements = append(res.Requirements, req)

			case "clarifications":
				if len(fields) > 0 && fields[0] != "" {
					res.Clarifications = append(res.Clarifications, DiscoveryClarification{Question: fields[0]})
				}

			case "assumptions":
				if len(fields) > 0 && fields[0] != "" {
					res.Assumptions = append(res.Assumptions, DiscoveryAssumption{Description: fields[0]})
				}
			}
		}
	}

	return res, nil
}

// EncodeRequirementsToTOON encodes a list of domain.Requirement into compact TOON string.
func EncodeRequirementsToTOON(reqs []domain.Requirement) string {
	if len(reqs) == 0 {
		return "requirements[0]{key,category,title,priority}:"
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("requirements[%d]{key,category,title,priority}:\n", len(reqs)))
	for _, r := range reqs {
		row := formatCSVRow([]string{r.RequirementKey, string(r.Category), r.Title, string(r.Priority)})
		writeTOONRow(&sb, row)
	}
	return strings.TrimSpace(sb.String())
}

func writeTOONRow(sb *strings.Builder, row string) {
	sb.WriteString("  ")
	sb.WriteString(row)
	sb.WriteByte('\n')
}

// Helper: format a list of strings into a standard CSV row.
func formatCSVRow(fields []string) string {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)
	_ = w.Write(fields)
	w.Flush()
	return strings.TrimSuffix(buf.String(), "\n")
}

// Helper: parse a CSV row string into slices.
func parseCSVRow(rowStr string) ([]string, error) {
	r := csv.NewReader(strings.NewReader(rowStr))
	return r.Read()
}

// Helper: sanitize single-line string for scalar field
func sanitizeTOONString(s string) string {
	s = strings.ReplaceAll(s, "\r\n", " ")
	s = strings.ReplaceAll(s, "\n", " ")
	return strings.TrimSpace(s)
}

// CalculateTokenSavings calculates approximate BPE token reduction between JSON and TOON.
// On typical OpenAI/Gemini tokenizers, 1 token is roughly 3.8 to 4 English characters.
func CalculateTokenSavings(jsonStr, toonStr string) (jsonTokens, toonTokens int, savingsPercent float64) {
	// Standard LLM heuristic: ~3.8 chars per token for structured data (JSON/YAML/TOON)
	jsonTokens = int(float64(len(jsonStr)) / 3.8)
	toonTokens = int(float64(len(toonStr)) / 3.8)
	if jsonTokens <= 0 {
		return 0, 0, 0.0
	}
	savingsPercent = (float64(jsonTokens-toonTokens) / float64(jsonTokens)) * 100.0
	if savingsPercent < 0 {
		savingsPercent = 0.0
	}
	return jsonTokens, toonTokens, savingsPercent
}
