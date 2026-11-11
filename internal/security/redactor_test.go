package security

import (
	"strings"
	"testing"
)

func TestRedactSensitiveData(t *testing.T) {
	input := `
	Authorization: Bearer mySecretToken123456789
	apiKey: AIzaSyD987654321abcdefghijklmn
	openai: sk-abcdefghijklmnopqrstuvwxyz12345
	`
	sanitized := RedactSensitiveData(input)

	if strings.Contains(sanitized, "mySecretToken123456789") {
		t.Errorf("bearer token was not redacted")
	}
	if strings.Contains(sanitized, "AIzaSyD987654321abcdefghijklmn") {
		t.Errorf("google api key was not redacted")
	}
	if strings.Contains(sanitized, "sk-abcdefghijklmnopqrstuvwxyz12345") {
		t.Errorf("openai key was not redacted")
	}
}
