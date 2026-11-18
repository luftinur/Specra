package ai

import (
	"bytes"
	"encoding/json"
	"regexp"
	"strings"

	"ai-requirements-studio/internal/domain"
)

var ansiEscapeRegex = regexp.MustCompile(`\x1b\[[0-9;?]*[a-zA-Z]`)

// StripANSI removes terminal ANSI color/control escape sequences from CLI output.
func StripANSI(s string) string {
	return ansiEscapeRegex.ReplaceAllString(s, "")
}

// SanitizeModelName normalizes a model identifier and strips leading CLI flag prefixes.
func SanitizeModelName(name string) string {
	trimmed := strings.TrimSpace(name)
	trimmed = strings.ReplaceAll(trimmed, "\n", "")
	trimmed = strings.ReplaceAll(trimmed, "\r", "")
	return strings.TrimLeft(trimmed, "-")
}

type kiroModelEntry struct {
	ID          string `json:"id"`
	ModelID     string `json:"model_id"`
	Name        string `json:"name"`
	ModelName   string `json:"model_name"`
	DisplayName string `json:"display_name"`
	Description string `json:"description"`
}

func resolveKiroEntryFields(item kiroModelEntry) (id, name, desc string) {
	id = strings.TrimSpace(item.ID)
	if id == "" {
		id = strings.TrimSpace(item.ModelID)
	}
	name = strings.TrimSpace(item.Name)
	if name == "" {
		name = strings.TrimSpace(item.ModelName)
	}
	if name == "" {
		name = strings.TrimSpace(item.DisplayName)
	}
	return id, name, strings.TrimSpace(item.Description)
}

func appendUniqueKiroModel(dst []domain.ModelInfo, seen map[string]bool, id, name, desc string) []domain.ModelInfo {
	cleanID := strings.TrimSpace(id)
	if cleanID == "" || seen[cleanID] {
		return dst
	}
	seen[cleanID] = true
	display := strings.TrimSpace(name)
	if display == "" {
		display = cleanID
	}
	return append(dst, domain.ModelInfo{
		ID:          cleanID,
		DisplayName: display,
		Description: strings.TrimSpace(desc),
	})
}

// ParseKiroModelsOutput parses the output of `kiro-cli chat --list-models --format json`
// with fallback support for array/object variants and plain-text CLI lines.
func ParseKiroModelsOutput(raw []byte) []domain.ModelInfo {
	cleaned := strings.TrimSpace(StripANSI(string(raw)))
	if cleaned == "" {
		return nil
	}

	var models []domain.ModelInfo
	seen := make(map[string]bool)

	// Extract JSON payload even if preceded by status/log lines.
	jsonPayload := []byte(cleaned)
	if !strings.HasPrefix(cleaned, "{") && !strings.HasPrefix(cleaned, "[") {
		objIdx := bytes.IndexByte(jsonPayload, '{')
		arrIdx := bytes.IndexByte(jsonPayload, '[')
		startIdx := -1
		if objIdx >= 0 && (arrIdx < 0 || objIdx < arrIdx) {
			startIdx = objIdx
		} else if arrIdx >= 0 {
			startIdx = arrIdx
		}
		if startIdx >= 0 {
			jsonPayload = jsonPayload[startIdx:]
		}
	}

	var objPayload struct {
		Data         []kiroModelEntry `json:"data"`
		Models       []kiroModelEntry `json:"models"`
		DefaultModel string           `json:"default_model"`
	}
	if err := json.Unmarshal(jsonPayload, &objPayload); err == nil {
		entries := objPayload.Data
		if len(entries) == 0 {
			entries = objPayload.Models
		}
		for _, item := range entries {
			id, name, desc := resolveKiroEntryFields(item)
			models = appendUniqueKiroModel(models, seen, id, name, desc)
		}
		if defID := strings.TrimSpace(objPayload.DefaultModel); defID != "" {
			models = appendUniqueKiroModel(models, seen, defID, defID, "")
		}
		if len(models) > 0 {
			return models
		}
	}

	var arrPayload []kiroModelEntry
	if err := json.Unmarshal(jsonPayload, &arrPayload); err == nil && len(arrPayload) > 0 {
		for _, item := range arrPayload {
			id, name, desc := resolveKiroEntryFields(item)
			models = appendUniqueKiroModel(models, seen, id, name, desc)
		}
		if len(models) > 0 {
			return models
		}
	}

	var strArr []string
	if err := json.Unmarshal(jsonPayload, &strArr); err == nil && len(strArr) > 0 {
		for _, id := range strArr {
			models = appendUniqueKiroModel(models, seen, id, id, "")
		}
		if len(models) > 0 {
			return models
		}
	}

	// Plain-text fallback when JSON is not returned.
	for _, rawLine := range strings.Split(cleaned, "\n") {
		line := strings.TrimSpace(rawLine)
		if line == "" ||
			strings.HasPrefix(line, "Fetching") ||
			strings.HasPrefix(line, "Usage:") ||
			strings.HasPrefix(line, "ID") ||
			strings.HasPrefix(line, "---") ||
			strings.HasPrefix(line, "{") ||
			strings.HasPrefix(line, "}") ||
			strings.HasPrefix(line, "[") ||
			strings.HasPrefix(line, "]") {
			continue
		}
		if strings.Contains(line, "\t") {
			parts := strings.Split(line, "\t")
			id := strings.TrimSpace(parts[0])
			name := id
			if len(parts) > 1 && strings.TrimSpace(parts[1]) != "" {
				name = strings.TrimSpace(parts[1])
			}
			models = appendUniqueKiroModel(models, seen, id, name, "")
			continue
		}
		fields := strings.Fields(line)
		if len(fields) > 0 {
			id := fields[0]
			name := id
			if len(fields) > 1 {
				name = strings.Join(fields[1:], " ")
			}
			models = appendUniqueKiroModel(models, seen, id, name, "")
		}
	}

	return models
}
