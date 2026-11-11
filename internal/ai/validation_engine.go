package ai

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"ai-requirements-studio/internal/domain"
)

var ambiguousWords = []string{
	"fast", "user-friendly", "as soon as possible", "asap",
	"seamless", "robust", "flexible", "easy to use", "optimal",
	"efficient", "scalable", "etc", "and so on",
}

type ValidationEngine struct{}

func NewValidationEngine() *ValidationEngine {
	return &ValidationEngine{}
}

func (ve *ValidationEngine) ValidatePRDCompleteness(prdContent string) []domain.ValidationFinding {
	var findings []domain.ValidationFinding

	if strings.TrimSpace(prdContent) == "" {
		findings = append(findings, domain.ValidationFinding{
			ID:          fmt.Sprintf("find-%d", time.Now().UnixNano()),
			Severity:    domain.SeverityConflict,
			FindingType: "missing_document",
			Description: "Dokumen PRD belum memiliki konten draft sama sekali.",
		})
		return findings
	}

	for idx, sec := range PRDSections {
		pattern := fmt.Sprintf(`(?i)##\s+%d\.\s+%s`, idx+1, regexp.QuoteMeta(sec))
		matched, _ := regexp.MatchString(pattern, prdContent)
		if !matched {
			findings = append(findings, domain.ValidationFinding{
				ID:          fmt.Sprintf("find-%d", time.Now().UnixNano()+int64(idx)),
				Severity:    domain.SeverityWarning,
				FindingType: "missing_prd_section",
				Description: fmt.Sprintf("PRD Section %d (%s) belum ditemukan atau belum lengkap.", idx+1, sec),
			})
		}
	}
	return findings
}

func (ve *ValidationEngine) ValidateSRSCompleteness(srsContent string) []domain.ValidationFinding {
	var findings []domain.ValidationFinding

	if strings.TrimSpace(srsContent) == "" {
		return findings // SRS might not be generated yet
	}

	for idx, sec := range SRSSections {
		pattern := fmt.Sprintf(`(?i)##\s+%d\.\s+%s`, idx+1, regexp.QuoteMeta(sec))
		matched, _ := regexp.MatchString(pattern, srsContent)
		if !matched {
			findings = append(findings, domain.ValidationFinding{
				ID:          fmt.Sprintf("find-%d", time.Now().UnixNano()+int64(idx)),
				Severity:    domain.SeverityWarning,
				FindingType: "missing_srs_section",
				Description: fmt.Sprintf("SRS Section %d (%s) belum ditemukan atau belum lengkap.", idx+1, sec),
			})
		}
	}
	return findings
}

func (ve *ValidationEngine) DetectAmbiguity(reqs []domain.Requirement) []domain.ValidationFinding {
	var findings []domain.ValidationFinding

	for _, r := range reqs {
		descLower := strings.ToLower(r.Description + " " + r.Title)
		for _, w := range ambiguousWords {
			if strings.Contains(descLower, w) {
				reqID := r.ID
				findings = append(findings, domain.ValidationFinding{
					ID:            fmt.Sprintf("find-%d", time.Now().UnixNano()),
					Severity:      domain.SeverityWarning,
					FindingType:   "ambiguous_requirement",
					RequirementID: &reqID,
					Description: fmt.Sprintf(
						"Requirement %s mengandung istilah ambigu '%s'. Disarankan menambahkan acceptance criteria yang terukur.",
						r.RequirementKey, w,
					),
				})
				break
			}
		}
	}
	return findings
}

func (ve *ValidationEngine) CheckUnconfirmedAssumptions(assumptions []domain.Assumption) []domain.ValidationFinding {
	var findings []domain.ValidationFinding
	for _, a := range assumptions {
		if a.Status == "unconfirmed" {
			findings = append(findings, domain.ValidationFinding{
				ID:          fmt.Sprintf("find-%d", time.Now().UnixNano()),
				Severity:    domain.SeverityWarning,
				FindingType: "unconfirmed_assumption",
				Description: fmt.Sprintf("Asumsi belum dikonfirmasi: \"%s\". Validasi dengan stakeholder.", a.Description),
			})
		}
	}
	return findings
}
