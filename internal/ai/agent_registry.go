package ai

import (
	"context"
	"encoding/json"
	"sync"

	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

type AgentRegistry struct {
	mu           sync.RWMutex
	providerRepo *storage.ProviderRepository
	agents       map[string]domain.AgentConfig
	mcpServers   map[string]domain.MCPServerConfig
	skills       map[string]domain.SkillConfig
}

func NewAgentRegistry(providerRepo *storage.ProviderRepository) *AgentRegistry {
	r := &AgentRegistry{
		providerRepo: providerRepo,
		agents:       make(map[string]domain.AgentConfig),
		mcpServers:   make(map[string]domain.MCPServerConfig),
		skills:       make(map[string]domain.SkillConfig),
	}
	r.initDefaults()
	r.loadFromRepo()
	return r
}

func (r *AgentRegistry) initDefaults() {
	// 0. Base Default Skills Catalog
	defaultSkills := []domain.SkillConfig{
		// Product Analyst Skills
		{ID: "product-discovery", Name: "Product Discovery", Category: "product", Description: "Identifikasi inti masalah bisnis, target user personas, dan proposisi nilai produk.", Prompt: "Prioritize user empathy and problem-solution fit.", Custom: false},
		{ID: "user-story-mapping", Name: "User Story Mapping", Category: "product", Description: "Penyusunan alur cerita pengguna dan backlog fitur berorientasi value delivery.", Prompt: "Structure epics, user stories, and acceptance criteria.", Custom: false},
		{ID: "moscow-prioritization", Name: "MoSCoW Prioritization", Category: "product", Description: "Kategorisasi kebutuhan: Must Have, Should Have, Could Have, Won't Have.", Prompt: "Enforce strict boundary for MVP release scope.", Custom: false},
		{ID: "business-kpi-definition", Name: "Business KPI Definition", Category: "product", Description: "Penetapan metrik kesuksesan terukur (ROI, user adoption, retention, SLAs).", Prompt: "Define measurable business metrics for every major feature.", Custom: false},

		// System Analyst Skills
		{ID: "ieee-830-specification", Name: "IEEE 830 Specification", Category: "system", Description: "Standar penulisan spesifikasi formal SRS yang dapat diverifikasi dan diuji.", Prompt: "Apply IEEE 830 structure with unambiguous functional requirements.", Custom: false},
		{ID: "functional-flow-modeling", Name: "Functional Flow & Data Modeling", Category: "system", Description: "Pemodelan state transitions, business logic rules, dan ERD schema.", Prompt: "Specify entity states, validations, and relational integrity.", Custom: false},
		{ID: "traceability-verification", Name: "Traceability Verification (RTM)", Category: "system", Description: "Matriks keterlacakan 1-to-1 antara kebutuhan bisnis PRD dan teknis SRS.", Prompt: "Map every SRS item directly to PRD requirement IDs.", Custom: false},
		{ID: "non-functional-sla-definition", Name: "Non-Functional SLA Definition", Category: "system", Description: "Penetapan metrik performa, ketersediaan 99.9%, dan keamanan.", Prompt: "Detail latency, throughput, and error budget constraints.", Custom: false},

		// Software Architect Skills
		{ID: "c4-architecture-modeling", Name: "C4 Architecture Modeling", Category: "architecture", Description: "Pemodelan topologi sistem C4 (Context, Container, Component, Code).", Prompt: "Use Mermaid C4 diagrams to define component boundaries.", Custom: false},
		{ID: "api-contract-engineering", Name: "API Contract Engineering", Category: "architecture", Description: "Perancangan RESTful OpenAPI 3.0 dan gRPC protobuf interfaces.", Prompt: "Specify clear endpoint schemas, error codes, and payload models.", Custom: false},
		{ID: "security-threat-modeling", Name: "Security Threat Modeling (STRIDE)", Category: "architecture", Description: "Analisis ancaman spoofing, tampering, repudiation, information disclosure, DoS, EoP.", Prompt: "Mitigate top OWASP and cloud architectural security risks.", Custom: false},
		{ID: "scalability-fault-tolerance", Name: "Scalability & Fault Tolerance", Category: "architecture", Description: "Desain arsitektur terdistribusi, caching tier, idempotency, dan rate limiting.", Prompt: "Design for zero downtime, graceful degradation, and horizontal scaling.", Custom: false},

		// UI/UX Agent Skills
		{ID: "semantic-design-tokens", Name: "Semantic Design Tokens", Category: "uiux", Description: "Sistem token desain warna, tipografi, dan elevasi semantik yang disesuaikan dengan kebutuhan proyek pengguna.", Prompt: "Define clean semantic design tokens and CSS custom properties tailored to the user's project requirements.", Custom: false},
		{ID: "atomic-component-hierarchy", Name: "Atomic Component Hierarchy", Category: "uiux", Description: "Hierarki komponen UI (Atoms, Molecules, Organisms, Templates).", Prompt: "Structure reusable component states and variants.", Custom: false},
		{ID: "mermaid-screen-flows", Name: "Mermaid Screen Flows", Category: "uiux", Description: "Visualisasi alur layar interaktif menggunakan Mermaid flowchart.", Prompt: "Visualize screen navigation, error states, and user interactions.", Custom: false},
		{ID: "wcag-accessibility-audit", Name: "WCAG 2.1 AA Accessibility", Category: "uiux", Description: "Standar aksesibilitas kontras warna 4.5:1, keyboard nav, dan aria-labels.", Prompt: "Ensure strict WCAG compliance and keyboard usability.", Custom: false},
	}

	for _, s := range defaultSkills {
		r.skills[s.ID] = s
	}

	// 1. Product Analyst Agent (PRD)
	r.agents["product-analyst"] = domain.AgentConfig{
		ID:   "product-analyst",
		Name: "Product Analyst Agent",
		Role: "Product Analyst & Business Strategist",
		SystemPrompt: `You are an elite Product Analyst and Business Strategy AI Agent.
Your focus is to analyze initial user ideas, clarify product scope, specify target audience personas, map comprehensive user journeys, and prioritize features using MoSCoW (Must Have, Should Have, Could Have, Won't Have).
You formulate structured Product Requirements Documents (PRD) with verifiable acceptance criteria.`,
		Skills: []string{
			"product-discovery",
			"user-story-mapping",
			"moscow-prioritization",
			"business-kpi-definition",
		},
		MCPServers: []string{},
	}

	// 2. System Analyst Agent (SRS)
	r.agents["system-analyst"] = domain.AgentConfig{
		ID:   "system-analyst",
		Name: "System Analyst Agent",
		Role: "Lead System Analyst & IEEE 830 Specialist",
		SystemPrompt: `You are a Principal System Analyst and IEEE 830 Systems Specification AI Agent.
Your focus is to translate product requirements into precise technical specifications, domain data models, state transition tables, business logic rules, and non-functional SLA metrics (performance, availability, security).
You establish rigorous traceability matrices connecting system specs back to PRD Requirement IDs.`,
		Skills: []string{
			"ieee-830-specification",
			"functional-flow-modeling",
			"traceability-verification",
			"non-functional-sla-definition",
		},
		MCPServers: []string{},
	}

	// 3. Software Architect Agent (Architecture)
	r.agents["software-architect"] = domain.AgentConfig{
		ID:   "software-architect",
		Name: "Software Architect Agent",
		Role: "Principal Software Architect",
		SystemPrompt: `You are a World-Class Principal Software Architect AI Agent.
Your focus is technical topology, system boundaries, C4 models (Context, Containers, Components), data pipeline patterns, REST/gRPC API contracts, and non-functional infrastructure resilience.
You formulate architectural decisions, concurrency models, caching tiers, database partitioning strategies, and security threat modeling (STRIDE).`,
		Skills: []string{
			"c4-architecture-modeling",
			"api-contract-engineering",
			"security-threat-modeling",
			"scalability-fault-tolerance",
		},
		MCPServers: []string{},
	}

	// 4. UI/UX Agent (Design System & Interface)
	r.agents["ui-ux-agent"] = domain.AgentConfig{
		ID:   "ui-ux-agent",
		Name: "UI/UX Agent",
		Role: "UI/UX Architect & Design System Specialist",
		SystemPrompt: `You are a World-Class UI/UX Architect and Design System Specialist AI Agent.
Your focus is aesthetic direction, cohesive semantic design tokens (color palettes, typography scale, spacing grids, elevation shadows), atomic component hierarchies, responsive screen flows, interactive state transitions, Mermaid diagrams, and developer-friendly Tailwind/CSS mappings.
You champion intuitive usability, empty states, and WCAG 2.1 AA accessibility.`,
		Skills: []string{
			"semantic-design-tokens",
			"atomic-component-hierarchy",
			"mermaid-screen-flows",
			"wcag-accessibility-audit",
		},
		MCPServers: []string{},
	}

	// Legacy aliases
	r.agents["prd-agent"] = r.agents["product-analyst"]
	r.agents["srs-agent"] = r.agents["system-analyst"]
	r.agents["design-agent"] = r.agents["ui-ux-agent"]
}

func (r *AgentRegistry) loadFromRepo() {
	if r.providerRepo == nil {
		return
	}
	ctx := context.Background()
	rawAgents, err := r.providerRepo.GetSetting(ctx, "agent_configs")
	if err == nil && rawAgents != "" {
		var customAgents []domain.AgentConfig
		if err := json.Unmarshal([]byte(rawAgents), &customAgents); err == nil {
			for _, a := range customAgents {
				r.agents[a.ID] = a
			}
		}
	}

	rawMCP, err := r.providerRepo.GetSetting(ctx, "mcp_servers")
	if err == nil && rawMCP != "" {
		var servers []domain.MCPServerConfig
		if err := json.Unmarshal([]byte(rawMCP), &servers); err == nil {
			for _, s := range servers {
				if s.Scope == "" {
					s.Scope = "global"
				}
				r.mcpServers[s.ID] = s
			}
		}
	}

	rawSkills, err := r.providerRepo.GetSetting(ctx, "custom_skills")
	if err == nil && rawSkills != "" {
		var customSkills []domain.SkillConfig
		if err := json.Unmarshal([]byte(rawSkills), &customSkills); err == nil {
			for _, sk := range customSkills {
				sk.Custom = true
				r.skills[sk.ID] = sk
			}
		}
	}
}

func (r *AgentRegistry) normalizeID(id string) string {
	switch id {
	case "prd-agent":
		return "product-analyst"
	case "srs-agent":
		return "system-analyst"
	case "design-agent":
		return "ui-ux-agent"
	default:
		return id
	}
}

func (r *AgentRegistry) GetAgent(id string) (domain.AgentConfig, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	normalized := r.normalizeID(id)
	a, ok := r.agents[normalized]
	if !ok {
		a, ok = r.agents[id]
	}
	return a, ok
}

func (r *AgentRegistry) ListAgents() []domain.AgentConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := make([]domain.AgentConfig, 0, 4)
	order := []string{"product-analyst", "system-analyst", "software-architect", "ui-ux-agent"}
	for _, id := range order {
		if a, ok := r.agents[id]; ok {
			res = append(res, a)
		}
	}
	return res
}

func (r *AgentRegistry) SaveAgent(config domain.AgentConfig) error {
	r.mu.Lock()
	normalized := r.normalizeID(config.ID)
	config.ID = normalized
	r.agents[normalized] = config
	r.mu.Unlock()

	if r.providerRepo != nil {
		list := r.ListAgents()
		bytes, err := json.Marshal(list)
		if err == nil {
			_ = r.providerRepo.SetSetting(context.Background(), "agent_configs", string(bytes))
		}
	}
	return nil
}

func (r *AgentRegistry) ListMCPServers() []domain.MCPServerConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := make([]domain.MCPServerConfig, 0, len(r.mcpServers))
	for _, s := range r.mcpServers {
		res = append(res, s)
	}
	return res
}

func (r *AgentRegistry) SaveMCPServer(server domain.MCPServerConfig) error {
	r.mu.Lock()
	if server.Scope == "" {
		server.Scope = "global"
	}
	r.mcpServers[server.ID] = server
	r.mu.Unlock()

	if r.providerRepo != nil {
		list := r.ListMCPServers()
		bytes, err := json.Marshal(list)
		if err == nil {
			_ = r.providerRepo.SetSetting(context.Background(), "mcp_servers", string(bytes))
		}
	}
	return nil
}

func (r *AgentRegistry) DeleteMCPServer(id string) error {
	r.mu.Lock()
	delete(r.mcpServers, id)
	r.mu.Unlock()

	if r.providerRepo != nil {
		list := r.ListMCPServers()
		bytes, err := json.Marshal(list)
		if err == nil {
			_ = r.providerRepo.SetSetting(context.Background(), "mcp_servers", string(bytes))
		}
	}
	return nil
}

func (r *AgentRegistry) ListSkills() []domain.SkillConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	res := make([]domain.SkillConfig, 0, len(r.skills))
	for _, sk := range r.skills {
		res = append(res, sk)
	}
	return res
}

func (r *AgentRegistry) SaveSkill(skill domain.SkillConfig) error {
	r.mu.Lock()
	skill.Custom = true
	r.skills[skill.ID] = skill

	customList := make([]domain.SkillConfig, 0)
	for _, sk := range r.skills {
		if sk.Custom {
			customList = append(customList, sk)
		}
	}
	r.mu.Unlock()

	if r.providerRepo != nil {
		bytes, err := json.Marshal(customList)
		if err == nil {
			_ = r.providerRepo.SetSetting(context.Background(), "custom_skills", string(bytes))
		}
	}
	return nil
}

func (r *AgentRegistry) DeleteSkill(id string) error {
	r.mu.Lock()
	delete(r.skills, id)

	customList := make([]domain.SkillConfig, 0)
	for _, sk := range r.skills {
		if sk.Custom {
			customList = append(customList, sk)
		}
	}
	r.mu.Unlock()

	if r.providerRepo != nil {
		bytes, err := json.Marshal(customList)
		if err == nil {
			_ = r.providerRepo.SetSetting(context.Background(), "custom_skills", string(bytes))
		}
	}
	return nil
}

func (r *AgentRegistry) GetSkillsForAgent(agentID string) []domain.SkillConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()

	normalized := r.normalizeID(agentID)
	agent, ok := r.agents[normalized]
	if !ok {
		agent, ok = r.agents[agentID]
	}
	if !ok {
		return []domain.SkillConfig{}
	}
	res := make([]domain.SkillConfig, 0, len(agent.Skills))
	for _, sID := range agent.Skills {
		if sk, exists := r.skills[sID]; exists {
			res = append(res, sk)
		} else {
			res = append(res, domain.SkillConfig{
				ID:          sID,
				Name:        sID,
				Description: "Specialized skill",
			})
		}
	}
	return res
}

func (r *AgentRegistry) GetMCPServersForAgent(agentID string) []domain.MCPServerConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	normalized := r.normalizeID(agentID)
	res := make([]domain.MCPServerConfig, 0)
	for _, s := range r.mcpServers {
		if !s.Enabled {
			continue
		}
		// Global scope is accessible to all personas
		if s.Scope == "" || s.Scope == "global" {
			res = append(res, s)
			continue
		}
		// Persona scope is only accessible to assigned agents
		for _, a := range s.AssignedAgents {
			if r.normalizeID(a) == normalized {
				res = append(res, s)
				break
			}
		}
	}
	return res
}
