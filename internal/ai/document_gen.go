package ai

import (
	"fmt"
	"regexp"
	"strings"

	"ai-requirements-studio/internal/domain"
)

var PRDSections = []string{
	"Executive Summary",
	"Product Vision",
	"Product Objectives",
	"Problem Statement",
	"Target Audience",
	"User Personas",
	"Business Goals and KPIs",
	"Product Scope",
	"Features and Capabilities",
	"User Stories",
	"User Journey",
	"User Flows",
	"Requirement Prioritization",
	"Business Rules",
	"Assumptions",
	"Constraints",
	"Dependencies",
	"Risks",
	"Product Acceptance Criteria",
	"Open Questions",
}

var SRSSections = []string{
	"Introduction",
	"System Overview",
	"System Context",
	"Architecture",
	"Technology Stack",
	"Functional Requirements",
	"Non-Functional Requirements",
	"Data Model",
	"Database Design",
	"API Specifications",
	"Application Workflows",
	"Business Logic",
	"Authentication and Authorization",
	"Security",
	"Privacy",
	"Integration Specifications",
	"Error Handling",
	"Logging and Diagnostics",
	"Testing Strategy",
	"Acceptance Criteria",
	"Traceability Matrix",
	"Constraints and Assumptions",
}

var DesignSections = []string{
	"Design Philosophy and Visual Language",
	"Brand Identity and Theme Guidelines",
	"Color Palette and Semantic Design Tokens",
	"Typography Hierarchy and Scale",
	"Spacing, Elevation and Grid Layout",
	"Component Architecture and Atomic Elements",
	"Navigation and User Screen Flows",
	"Wireframe Schemas and Layout Hierarchy",
	"Form and Input Interaction Patterns",
	"Responsive Breakpoints and Adaptation",
	"Motion, Transitions and Animations",
	"Iconography and Visual Assets",
	"Accessibility (WCAG 2.1 AA Compliance)",
	"Feedback, Empty States and Error Handling",
	"Design-to-Code Mapping (Tailwind CSS / Tokens)",
	"Asset Delivery and Export Specifications",
}

var ArchitectureSections = []string{
	"Executive Technical Summary",
	"System Goals and Quality Attributes",
	"Architectural Constraints and Decisions (ADRs)",
	"System Context Diagram (C4 Level 1 - Mermaid)",
	"Container Architecture Diagram (C4 Level 2 - Mermaid)",
	"Component Topology and Module Boundaries (C4 Level 3)",
	"Technology Stack and Framework Justifications",
	"Data Architecture, Storage Models and Partitioning",
	"Data Pipeline, Event Streaming and Concurrency",
	"API Interface Contracts (REST, gRPC, and GraphQL Specifications)",
	"Security Architecture and Threat Modeling (STRIDE)",
	"Authentication, Authorization and Identity Management",
	"Scalability, Caching and Rate-Limiting Strategy",
	"High Availability, Fault Tolerance and Disaster Recovery",
	"Observability, Telemetry, Metrics and Structured Logging",
	"Deployment Topology, Infrastructure as Code and CI/CD",
}

func BuildPRDGenerationPrompt(
	project *domain.Project,
	reqs []domain.Requirement,
	assumptions []domain.Assumption,
	clarifications []domain.Clarification,
) string {
	var reqBuilder strings.Builder
	for _, r := range reqs {
		reqBuilder.WriteString(fmt.Sprintf("- [%s] (%s) %s: %s (Priority: %s, Status: %s)\n",
			r.RequirementKey, r.Category, r.Title, r.Description, r.Priority, r.Status))
	}

	var assumpBuilder strings.Builder
	for _, a := range assumptions {
		assumpBuilder.WriteString(fmt.Sprintf("- [%s] %s\n", a.Status, a.Description))
	}

	var clarBuilder strings.Builder
	for _, c := range clarifications {
		ans := "Unanswered"
		if c.Answer != nil {
			ans = *c.Answer
		}
		clarBuilder.WriteString(fmt.Sprintf("- Q: %s | Answer: %s\n", c.Question, ans))
	}

	return fmt.Sprintf(`You are a Principal Product Manager for AI Requirements Studio.
Generate a complete, professional, publication-ready Product Requirements Document (PRD) in Markdown for the project described below.

PROJECT:
Name: %s
Description: %s

CONFIRMED REQUIREMENTS:
%s

ASSUMPTIONS:
%s

CLARIFICATION Q&A:
%s

DOCUMENT STRUCTURE REQUIREMENT:
You MUST structure the document using the following exact 20 numbered sections with Markdown H2 headings (## 1. Executive Summary, ## 2. Product Vision, etc.):
1. Executive Summary
2. Product Vision
3. Product Objectives
4. Problem Statement
5. Target Audience
6. User Personas
7. Business Goals and KPIs
8. Product Scope
9. Features and Capabilities
10. User Stories
11. User Journey
12. User Flows
13. Requirement Prioritization (incorporate MoSCoW table)
14. Business Rules
15. Assumptions
16. Constraints
17. Dependencies
18. Risks
19. Product Acceptance Criteria
20. Open Questions

Output valid CommonMark Markdown directly without conversational preface.`,
		project.Name, project.Description, reqBuilder.String(), assumpBuilder.String(), clarBuilder.String(),
	)
}

func BuildSRSGenerationPrompt(
	project *domain.Project,
	approvedPRD string,
	reqs []domain.Requirement,
) string {
	var reqBuilder strings.Builder
	for _, r := range reqs {
		reqBuilder.WriteString(fmt.Sprintf("- [%s] (%s) %s: %s (Priority: %s)\n",
			r.RequirementKey, r.Category, r.Title, r.Description, r.Priority))
	}

	return fmt.Sprintf(`You are a Lead Software Architect and System Analyst for AI Requirements Studio.
Generate a complete, professional Software Requirements Specification (SRS) in Markdown based on the APPROVED PRD below.

PROJECT:
Name: %s
Description: %s

APPROVED PRD BASELINE:
%s

STRUCTURED REQUIREMENTS:
%s

DOCUMENT STRUCTURE REQUIREMENT:
You MUST structure the document using the following exact 22 numbered sections with Markdown H2 headings (## 1. Introduction, ## 2. System Overview, etc.):
1. Introduction
2. System Overview
3. System Context
4. Architecture
5. Technology Stack
6. Functional Requirements
7. Non-Functional Requirements
8. Data Model
9. Database Design
10. API Specifications
11. Application Workflows
12. Business Logic
13. Authentication and Authorization
14. Security
15. Privacy
16. Integration Specifications
17. Error Handling
18. Logging and Diagnostics
19. Testing Strategy
20. Acceptance Criteria
21. Traceability Matrix (map system specs back to PRD Requirement IDs)
22. Constraints and Assumptions

Output valid CommonMark Markdown directly without conversational preface.`,
		project.Name, project.Description, approvedPRD, reqBuilder.String(),
	)
}

func BuildDesignGenerationPrompt(
	project *domain.Project,
	approvedPRD string,
	approvedSRS string,
	reqs []domain.Requirement,
) string {
	var reqBuilder strings.Builder
	for _, r := range reqs {
		if r.Category == domain.CategoryUIUX || r.Category == domain.CategoryFunctional {
			reqBuilder.WriteString(fmt.Sprintf("- [%s] (%s) %s: %s (Priority: %s)\n",
				r.RequirementKey, r.Category, r.Title, r.Description, r.Priority))
		}
	}

	return fmt.Sprintf(`You are an elite UI/UX Architect and Design System Specialist for AI Requirements Studio.
Generate a comprehensive Design Specification and Design System (design.md) for the following project:

PROJECT:
Name: %s
Description: %s

PRD BASELINE CONTEXT:
%s

SRS TECHNICAL CONTEXT:
%s

KEY UI/UX REQUIREMENTS:
%s

DOCUMENT STRUCTURE REQUIREMENT:
You MUST structure the document using the following exact 16 numbered sections with Markdown H2 headings (## 1. Design Philosophy and Visual Language, etc.):
1. Design Philosophy and Visual Language
2. Brand Identity and Theme Guidelines
3. Color Palette and Semantic Design Tokens (include light/dark hex tokens table)
4. Typography Hierarchy and Scale (font families, sizes, weights, line heights)
5. Spacing, Elevation and Grid Layout (4pt/8pt grid, shadow scales, container widths)
6. Component Architecture and Atomic Elements (buttons, inputs, cards, dialogs, badges)
7. Navigation and User Screen Flows (include Mermaid flowchart/state diagram)
8. Wireframe Schemas and Layout Hierarchy (header, sidebar, canvas, inspector layout)
9. Form and Input Interaction Patterns (validation states, focus rings, disabled behavior)
10. Responsive Breakpoints and Adaptation (mobile, tablet, desktop, ultra-wide)
11. Motion, Transitions and Animations (duration, easing curves, micro-interactions)
12. Iconography and Visual Assets (icon set guidelines, stroke widths, bounding boxes)
13. Accessibility (WCAG 2.1 AA Compliance) (contrast ratios, keyboard focus, ARIA tags)
14. Feedback, Empty States and Error Handling (toast alerts, empty illustrations, banner styling)
15. Design-to-Code Mapping (Tailwind CSS utility classes & CSS custom properties)
16. Asset Delivery and Export Specifications (SVG guidelines, raster asset densities, favicon)

Output valid CommonMark Markdown directly without conversational preface.`,
		project.Name, project.Description, approvedPRD, approvedSRS, reqBuilder.String(),
	)
}

func BuildArchitectureGenerationPrompt(
	project *domain.Project,
	approvedPRD string,
	approvedSRS string,
	reqs []domain.Requirement,
) string {
	var reqBuilder strings.Builder
	for _, r := range reqs {
		reqBuilder.WriteString(fmt.Sprintf("- [%s] %s (%s, Priority: %s): %s\n",
			r.RequirementKey, r.Title, r.Category, r.Priority, r.Description))
	}

	return fmt.Sprintf(`You are a Principal Software Architect.
Generate an industry-standard, comprehensive Architecture Document (architecture.md) for the project:
Project Name: %s
Project Description: %s

APPROVED PRD CONTEXT:
%s

APPROVED SRS CONTEXT:
%s

REQUIREMENTS CONTEXT:
%s

STRUCTURE INSTRUCTIONS:
Generate all 16 numbered sections in order, using "## {number}. {Section Title}":
1. Executive Technical Summary
2. System Goals and Quality Attributes (latency, availability, throughput, fault tolerance)
3. Architectural Constraints and Decisions (ADRs) (key architectural decisions with rationale)
4. System Context Diagram (C4 Level 1 - Mermaid) (include full mermaid flowchart/graph)
5. Container Architecture Diagram (C4 Level 2 - Mermaid) (include mermaid diagram of applications, DB, APIs)
6. Component Topology and Module Boundaries (C4 Level 3) (internal service modules and dependency graph)
7. Technology Stack and Framework Justifications (backend, frontend, database, protocols)
8. Data Architecture, Storage Models and Partitioning (database engines, schema structures, indexing)
9. Data Pipeline, Event Streaming and Concurrency (event busses, queues, threading/goroutines)
10. API Interface Contracts (REST, gRPC, and GraphQL Specifications) (routes, schemas, error formats)
11. Security Architecture and Threat Modeling (STRIDE) (spoofing, tampering, repudiation, information disclosure)
12. Authentication, Authorization and Identity Management (JWT/OAuth2, RBAC matrix, sessions)
13. Scalability, Caching and Rate-Limiting Strategy (cache invalidation, CDN, token bucket limits)
14. High Availability, Fault Tolerance and Disaster Recovery (circuit breakers, retry policies, RTO/RPO)
15. Observability, Telemetry, Metrics and Structured Logging (OpenTelemetry, Prometheus, structured logs)
16. Deployment Topology, Infrastructure as Code and CI/CD (Docker, orchestration, deployment phases)

Output valid CommonMark Markdown directly without conversational preface.`,
		project.Name, project.Description, approvedPRD, approvedSRS, reqBuilder.String(),
	)
}

func BuildSectionRegeneratePrompt(
	docType domain.DocumentType,
	sectionNum int,
	sectionTitle string,
	currentDoc string,
	reqs []domain.Requirement,
) string {
	return fmt.Sprintf(`You are an expert technical documentation assistant.
Regenerate ONLY Section %d: "%s" for the %s document.

CURRENT DOCUMENT CONTEXT:
%s

REQUIREMENTS CONTEXT:
%d requirements registered.

OUTPUT INSTRUCTION:
Return ONLY the regenerated section content including the heading:
"## %d. %s"
Do not output other sections.`,
		sectionNum, sectionTitle, strings.ToUpper(string(docType)), currentDoc, len(reqs), sectionNum, sectionTitle,
	)
}

// ReplaceSection replaces a section matching "## {num}. {title}" in the markdown content
func ReplaceSection(fullMarkdown string, sectionNum int, sectionTitle string, newSectionContent string) string {
	pattern := fmt.Sprintf(`(?ms)^##\s+%d\.\s+.*?(?=^##\s+\d+\.|\z)`, sectionNum)
	re, err := regexp.Compile(pattern)
	if err != nil {
		return fullMarkdown
	}

	if re.MatchString(fullMarkdown) {
		return re.ReplaceAllString(fullMarkdown, strings.TrimSpace(newSectionContent)+"\n\n")
	}

	// If section header wasn't found, append at the end
	return fullMarkdown + "\n\n" + strings.TrimSpace(newSectionContent) + "\n"
}
