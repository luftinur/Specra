package security

import (
	"regexp"
)

var (
	// Redaction regex patterns
	bearerRegex = regexp.MustCompile(`(?i)(bearer\s+)([A-Za-z0-9_\-\.]{10,})`)
	apiKeyRegex = regexp.MustCompile(`(?i)(api[_-]?key["':\s=]+)([A-Za-z0-9_\-\.]{10,})`)
	skRegex     = regexp.MustCompile(`\b(sk-[A-Za-z0-9]{20,})\b`)
	googleRegex = regexp.MustCompile(`\b(AIzaSy[A-Za-z0-9_\-]{30,})\b`)
)

func RedactSensitiveData(text string) string {
	res := bearerRegex.ReplaceAllString(text, "${1}[REDACTED]")
	res = apiKeyRegex.ReplaceAllString(res, "${1}[REDACTED]")
	res = skRegex.ReplaceAllString(res, "[REDACTED_OPENAI_KEY]")
	res = googleRegex.ReplaceAllString(res, "[REDACTED_GOOGLE_KEY]")
	return res
}
