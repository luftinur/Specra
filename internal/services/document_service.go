package services

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/domain"
	"ai-requirements-studio/internal/storage"
)

// DialogManager decouples desktop GUI dialog implementations (e.g. Wails)
// from domain business logic, allowing headless testing and cross-platform compilation.
type DialogManager interface {
	SelectDirectory(title string) (string, error)
	SelectSaveFile(title string, defaultFilename string) (string, error)
}

type DocumentService struct {
	docRepo       *storage.DocumentRepository
	projRepo      *storage.ProjectRepository
	reqRepo       *storage.RequirementRepository
	convRepo      *storage.ConversationRepository
	providerRepo  *storage.ProviderRepository
	workspace     *storage.WorkspaceManager
	orchestrator  *ai.Orchestrator
	dialogManager DialogManager
}

//wails:ignore
func (s *DocumentService) SetDialogManager(dm DialogManager) {
	s.dialogManager = dm
}

func NewDocumentService(
	docRepo *storage.DocumentRepository,
	projRepo *storage.ProjectRepository,
	reqRepo *storage.RequirementRepository,
	convRepo *storage.ConversationRepository,
	wm *storage.WorkspaceManager,
	orch *ai.Orchestrator,
) *DocumentService {
	return &DocumentService{
		docRepo:      docRepo,
		projRepo:     projRepo,
		reqRepo:      reqRepo,
		convRepo:     convRepo,
		workspace:    wm,
		orchestrator: orch,
	}
}

func (s *DocumentService) SetProviderRepo(pr *storage.ProviderRepository) {
	s.providerRepo = pr
}

func (s *DocumentService) getDocLanguage(ctx context.Context) string {
	if s.providerRepo != nil {
		if val, err := s.providerRepo.GetSetting(ctx, "gen_doc_language"); err == nil && val != "" {
			return val
		}
		if val, err := s.providerRepo.GetSetting(ctx, "gen_language"); err == nil && val != "" {
			return val
		}
	}
	return "en"
}

func (s *DocumentService) getWorkDir(projectID string) string {
	if s.workspace != nil {
		return s.workspace.ProjectDir(projectID)
	}
	return ""
}

func (s *DocumentService) GetDocumentDetails(projectID string, docType string) (map[string]any, error) {
	ctx := context.Background()
	dt := domain.DocumentType(docType)

	doc, err := s.docRepo.GetOrCreate(ctx, projectID, dt)
	if err != nil {
		return nil, fmt.Errorf("failed to get document: %w", err)
	}

	currVer, err := s.docRepo.GetCurrentVersion(ctx, doc.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get current version: %w", err)
	}

	versions, err := s.docRepo.ListVersions(ctx, doc.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions: %w", err)
	}

	sections := ai.PRDSections
	if dt == domain.DocTypeSRS {
		sections = ai.SRSSections
	} else if dt == domain.DocTypeArchitecture {
		sections = ai.ArchitectureSections
	} else if dt == domain.DocTypeDesign {
		sections = ai.DesignSections
	}

	return map[string]any{
		"document":        doc,
		"current_version": currVer,
		"versions":        versions,
		"sections":        sections,
	}, nil
}

func (s *DocumentService) GetDocument(projectID string, docType string) (*domain.Document, error) {
	ctx := context.Background()
	dt := domain.DocumentType(docType)
	return s.docRepo.GetOrCreate(ctx, projectID, dt)
}

func (s *DocumentService) GeneratePRD(projectID string) (*domain.DocumentVersion, error) {
	ctx := context.Background()

	project, err := s.projRepo.Get(ctx, projectID)
	if err != nil {
		return nil, fmt.Errorf("project not found: %w", err)
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)
	assump, _ := s.convRepo.ListAssumptions(ctx, projectID)
	clar, _ := s.convRepo.ListClarifications(ctx, projectID)

	prompt := ai.BuildPRDGenerationPrompt(project, reqs, assump, clar, s.getDocLanguage(ctx))

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "Product Analyst",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate PRD via AI: %w", err)
	}

	content := strings.TrimSpace(resp.Content)

	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	if err != nil {
		return nil, err
	}

	var srcVerID *string
	if doc.CurrentVersionID != nil {
		srcVerID = doc.CurrentVersionID
	}

	ver, err := s.docRepo.AddVersion(ctx, doc.ID, content, srcVerID)
	if err != nil {
		return nil, fmt.Errorf("failed to save PRD version: %w", err)
	}

	// Sync to local project workspace: PRD.md
	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "PRD.md", []byte(content))
	}

	return ver, nil
}

func (s *DocumentService) RegeneratePRDSection(projectID string, sectionNumber int) (*domain.DocumentVersion, error) {
	ctx := context.Background()
	if sectionNumber < 1 || sectionNumber > len(ai.PRDSections) {
		return nil, fmt.Errorf("invalid section number: %d", sectionNumber)
	}
	sectionTitle := ai.PRDSections[sectionNumber-1]

	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	if err != nil {
		return nil, err
	}

	currVer, err := s.docRepo.GetCurrentVersion(ctx, doc.ID)
	if err != nil || currVer == nil {
		return nil, fmt.Errorf("cannot regenerate section: PRD has not been generated yet")
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)
	prompt := ai.BuildSectionRegeneratePrompt(domain.DocTypePRD, sectionNumber, sectionTitle, currVer.Content, reqs)

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "Product Analyst",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to regenerate PRD section via AI: %w", err)
	}

	updatedContent := ai.ReplaceSection(currVer.Content, sectionNumber, sectionTitle, resp.Content)
	newVer, err := s.docRepo.AddVersion(ctx, doc.ID, updatedContent, &currVer.ID)
	if err != nil {
		return nil, err
	}

	if doc.Status == domain.DocStatusOutdated {
		_ = s.docRepo.UpdateDocumentStatus(ctx, doc.ID, domain.DocStatusDraft)
	}

	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "PRD.md", []byte(updatedContent))
	}

	return newVer, nil
}

func (s *DocumentService) ApprovePRD(projectID string, versionID string) error {
	ctx := context.Background()
	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	if err != nil {
		return err
	}

	if err := s.docRepo.ApproveVersion(ctx, doc.ID, versionID); err != nil {
		return err
	}

	// Update document file status in workspace
	if s.workspace != nil {
		curr, _ := s.docRepo.GetCurrentVersion(ctx, doc.ID)
		if curr != nil {
			_ = s.workspace.WriteDocument(projectID, "PRD.md", []byte(curr.Content))
		}
	}
	return nil
}

// GenerateSRS - GATED BY APPROVED PRD (SYS-SRS-001)
func (s *DocumentService) GenerateSRS(projectID string) (*domain.DocumentVersion, error) {
	ctx := context.Background()

	// 1. Verify PRD Approval Gate
	prdDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	if err != nil {
		return nil, fmt.Errorf("failed to check PRD status: %w", err)
	}
	if prdDoc.Status != domain.DocStatusApproved {
		return nil, fmt.Errorf("SRS Generation Gated: PRD must be APPROVED by the user before SRS can be generated (current status: %s)", prdDoc.Status)
	}

	prdVersion, err := s.docRepo.GetCurrentVersion(ctx, prdDoc.ID)
	if err != nil || prdVersion == nil {
		return nil, fmt.Errorf("approved PRD content not found")
	}

	project, err := s.projRepo.Get(ctx, projectID)
	if err != nil {
		return nil, err
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)

	prompt := ai.BuildSRSGenerationPrompt(project, prdVersion.Content, reqs, s.getDocLanguage(ctx))

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "System Analyst",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate SRS via AI: %w", err)
	}

	content := strings.TrimSpace(resp.Content)

	srsDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)
	if err != nil {
		return nil, err
	}

	var srcVerID *string
	if srsDoc.CurrentVersionID != nil {
		srcVerID = srsDoc.CurrentVersionID
	}

	ver, err := s.docRepo.AddVersion(ctx, srsDoc.ID, content, srcVerID)
	if err != nil {
		return nil, fmt.Errorf("failed to save SRS version: %w", err)
	}

	// Reset status from outdated to draft so the new version is treated as up-to-date draft
	_ = s.docRepo.UpdateDocumentStatus(ctx, srsDoc.ID, domain.DocStatusDraft)

	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "SRS.md", []byte(content))
	}

	return ver, nil
}

func (s *DocumentService) RegenerateSRSSection(projectID string, sectionNumber int) (*domain.DocumentVersion, error) {
	ctx := context.Background()
	if sectionNumber < 1 || sectionNumber > len(ai.SRSSections) {
		return nil, fmt.Errorf("invalid section number: %d", sectionNumber)
	}
	sectionTitle := ai.SRSSections[sectionNumber-1]

	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)
	if err != nil {
		return nil, err
	}

	currVer, err := s.docRepo.GetCurrentVersion(ctx, doc.ID)
	if err != nil || currVer == nil {
		return nil, fmt.Errorf("cannot regenerate section: SRS has not been generated yet")
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)
	prompt := ai.BuildSectionRegeneratePrompt(domain.DocTypeSRS, sectionNumber, sectionTitle, currVer.Content, reqs)

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "System Analyst",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to regenerate SRS section via AI: %w", err)
	}

	updatedContent := ai.ReplaceSection(currVer.Content, sectionNumber, sectionTitle, resp.Content)
	newVer, err := s.docRepo.AddVersion(ctx, doc.ID, updatedContent, &currVer.ID)
	if err != nil {
		return nil, err
	}

	if doc.Status == domain.DocStatusOutdated {
		_ = s.docRepo.UpdateDocumentStatus(ctx, doc.ID, domain.DocStatusDraft)
	}

	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "SRS.md", []byte(updatedContent))
	}

	return newVer, nil
}

func (s *DocumentService) ApproveSRS(projectID string, versionID string) error {
	ctx := context.Background()
	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)
	if err != nil {
		return err
	}

	if err := s.docRepo.ApproveVersion(ctx, doc.ID, versionID); err != nil {
		return err
	}

	if s.workspace != nil {
		curr, _ := s.docRepo.GetCurrentVersion(ctx, doc.ID)
		if curr != nil {
			_ = s.workspace.WriteDocument(projectID, "SRS.md", []byte(curr.Content))
		}
	}
	return nil
}

func (s *DocumentService) GenerateDesign(projectID string) (*domain.DocumentVersion, error) {
	ctx := context.Background()

	// 1. Gate: Verify PRD exists and is approved
	prdDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve PRD document: %w", err)
	}

	if prdDoc.Status != domain.DocStatusApproved {
		return nil, fmt.Errorf("Design Generation Gated: PRD must be APPROVED before Design System can be generated (current status: %s)", prdDoc.Status)
	}

	prdVersion, err := s.docRepo.GetCurrentVersion(ctx, prdDoc.ID)
	if err != nil || prdVersion == nil {
		return nil, fmt.Errorf("approved PRD content not found")
	}

	// 2. SRS context (optional or baseline if generated)
	srsContent := ""
	srsDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)
	if err == nil && srsDoc.CurrentVersionID != nil {
		if srsVer, _ := s.docRepo.GetCurrentVersion(ctx, srsDoc.ID); srsVer != nil {
			srsContent = srsVer.Content
		}
	}

	project, err := s.projRepo.Get(ctx, projectID)
	if err != nil {
		return nil, err
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)

	prompt := ai.BuildDesignGenerationPrompt(project, prdVersion.Content, srsContent, reqs, s.getDocLanguage(ctx))

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "UI/UX Architect",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate Design System via AI: %w", err)
	}

	content := strings.TrimSpace(resp.Content)

	designDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeDesign)
	if err != nil {
		return nil, err
	}

	var srcVerID *string
	if designDoc.CurrentVersionID != nil {
		srcVerID = designDoc.CurrentVersionID
	}

	ver, err := s.docRepo.AddVersion(ctx, designDoc.ID, content, srcVerID)
	if err != nil {
		return nil, fmt.Errorf("failed to save Design version: %w", err)
	}

	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "design.md", []byte(content))
	}

	return ver, nil
}

func (s *DocumentService) RegenerateDesignSection(projectID string, sectionNumber int) (*domain.DocumentVersion, error) {
	ctx := context.Background()
	if sectionNumber < 1 || sectionNumber > len(ai.DesignSections) {
		return nil, fmt.Errorf("invalid section number: %d", sectionNumber)
	}
	sectionTitle := ai.DesignSections[sectionNumber-1]

	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeDesign)
	if err != nil {
		return nil, err
	}

	currVer, err := s.docRepo.GetCurrentVersion(ctx, doc.ID)
	if err != nil || currVer == nil {
		return nil, fmt.Errorf("cannot regenerate section: Design System has not been generated yet")
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)
	prompt := ai.BuildSectionRegeneratePrompt(domain.DocTypeDesign, sectionNumber, sectionTitle, currVer.Content, reqs)

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "UI/UX Architect",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to regenerate Design section via AI: %w", err)
	}

	updatedContent := ai.ReplaceSection(currVer.Content, sectionNumber, sectionTitle, resp.Content)
	newVer, err := s.docRepo.AddVersion(ctx, doc.ID, updatedContent, &currVer.ID)
	if err != nil {
		return nil, err
	}

	if doc.Status == domain.DocStatusOutdated {
		_ = s.docRepo.UpdateDocumentStatus(ctx, doc.ID, domain.DocStatusDraft)
	}

	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "design.md", []byte(updatedContent))
	}

	return newVer, nil
}

func (s *DocumentService) ApproveDesign(projectID string, versionID string) error {
	ctx := context.Background()
	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeDesign)
	if err != nil {
		return err
	}

	if err := s.docRepo.ApproveVersion(ctx, doc.ID, versionID); err != nil {
		return err
	}

	if s.workspace != nil {
		curr, _ := s.docRepo.GetCurrentVersion(ctx, doc.ID)
		if curr != nil {
			_ = s.workspace.WriteDocument(projectID, "design.md", []byte(curr.Content))
		}
	}
	return nil
}

func (s *DocumentService) GenerateArchitecture(projectID string) (*domain.DocumentVersion, error) {
	ctx := context.Background()

	// 1. Gate: Verify PRD exists and is approved
	prdDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypePRD)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve PRD document: %w", err)
	}

	if prdDoc.Status != domain.DocStatusApproved {
		return nil, fmt.Errorf("Architecture Generation Gated: PRD must be APPROVED before Technical Architecture can be generated (current status: %s)", prdDoc.Status)
	}

	prdVersion, err := s.docRepo.GetCurrentVersion(ctx, prdDoc.ID)
	if err != nil || prdVersion == nil {
		return nil, fmt.Errorf("approved PRD content not found")
	}

	// 2. SRS context if available
	srsContent := ""
	srsDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeSRS)
	if err == nil && srsDoc.CurrentVersionID != nil {
		if srsVer, _ := s.docRepo.GetCurrentVersion(ctx, srsDoc.ID); srsVer != nil {
			srsContent = srsVer.Content
		}
	}

	project, err := s.projRepo.Get(ctx, projectID)
	if err != nil {
		return nil, err
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)

	prompt := ai.BuildArchitectureGenerationPrompt(project, prdVersion.Content, srsContent, reqs, s.getDocLanguage(ctx))

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "Principal Software Architect",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to generate Architecture via AI: %w", err)
	}

	content := strings.TrimSpace(resp.Content)

	archDoc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeArchitecture)
	if err != nil {
		return nil, err
	}

	var srcVerID *string
	if archDoc.CurrentVersionID != nil {
		srcVerID = archDoc.CurrentVersionID
	}

	ver, err := s.docRepo.AddVersion(ctx, archDoc.ID, content, srcVerID)
	if err != nil {
		return nil, fmt.Errorf("failed to save Architecture version: %w", err)
	}

	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "architecture.md", []byte(content))
	}

	return ver, nil
}

func (s *DocumentService) RegenerateArchitectureSection(projectID string, sectionNumber int) (*domain.DocumentVersion, error) {
	ctx := context.Background()
	if sectionNumber < 1 || sectionNumber > len(ai.ArchitectureSections) {
		return nil, fmt.Errorf("invalid section number: %d", sectionNumber)
	}
	sectionTitle := ai.ArchitectureSections[sectionNumber-1]

	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeArchitecture)
	if err != nil {
		return nil, err
	}

	currVer, err := s.docRepo.GetCurrentVersion(ctx, doc.ID)
	if err != nil || currVer == nil {
		return nil, fmt.Errorf("cannot regenerate section: Architecture document has not been generated yet")
	}

	reqs, _ := s.reqRepo.ListByProject(ctx, projectID)
	prompt := ai.BuildSectionRegeneratePrompt(domain.DocTypeArchitecture, sectionNumber, sectionTitle, currVer.Content, reqs)

	resp, err := s.orchestrator.Execute(ctx, ai.GenerateRequest{
		ProjectID: projectID,
		WorkDir:   s.getWorkDir(projectID),
		Role:      "Principal Software Architect",
		Prompt:    prompt,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to regenerate Architecture section via AI: %w", err)
	}

	updatedContent := ai.ReplaceSection(currVer.Content, sectionNumber, sectionTitle, resp.Content)
	newVer, err := s.docRepo.AddVersion(ctx, doc.ID, updatedContent, &currVer.ID)
	if err != nil {
		return nil, err
	}

	if doc.Status == domain.DocStatusOutdated {
		_ = s.docRepo.UpdateDocumentStatus(ctx, doc.ID, domain.DocStatusDraft)
	}

	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, "architecture.md", []byte(updatedContent))
	}

	return newVer, nil
}

func (s *DocumentService) ApproveArchitecture(projectID string, versionID string) error {
	ctx := context.Background()
	doc, err := s.docRepo.GetOrCreate(ctx, projectID, domain.DocTypeArchitecture)
	if err != nil {
		return err
	}

	if err := s.docRepo.ApproveVersion(ctx, doc.ID, versionID); err != nil {
		return err
	}

	if s.workspace != nil {
		curr, _ := s.docRepo.GetCurrentVersion(ctx, doc.ID)
		if curr != nil {
			_ = s.workspace.WriteDocument(projectID, "architecture.md", []byte(curr.Content))
		}
	}
	return nil
}

func (s *DocumentService) SaveManualEdit(projectID string, docType string, content string) (*domain.DocumentVersion, error) {
	ctx := context.Background()
	dt := domain.DocumentType(docType)
	doc, err := s.docRepo.GetOrCreate(ctx, projectID, dt)
	if err != nil {
		return nil, err
	}

	currVer, _ := s.docRepo.GetCurrentVersion(ctx, doc.ID)
	var srcVerID *string
	if currVer != nil {
		srcVerID = &currVer.ID
	}

	newVer, err := s.docRepo.AddVersion(ctx, doc.ID, content, srcVerID)
	if err != nil {
		return nil, err
	}

	filename := "PRD.md"
	if dt == domain.DocTypeSRS {
		filename = "SRS.md"
	} else if dt == domain.DocTypeArchitecture {
		filename = "architecture.md"
	} else if dt == domain.DocTypeDesign {
		filename = "design.md"
	}
	if s.workspace != nil {
		_ = s.workspace.WriteDocument(projectID, filename, []byte(content))
	}

	return newVer, nil
}

func (s *DocumentService) ExportDocument(projectID string, docType string, targetPath string) error {
	ctx := context.Background()
	dt := domain.DocumentType(docType)
	doc, err := s.docRepo.GetOrCreate(ctx, projectID, dt)
	if err != nil {
		return err
	}

	currVer, err := s.docRepo.GetCurrentVersion(ctx, doc.ID)
	if err != nil || currVer == nil {
		return fmt.Errorf("no version available to export for %s", docType)
	}

	return os.WriteFile(targetPath, []byte(currVer.Content), 0644)
}

func (s *DocumentService) ExportAllDocuments(projectID string, targetDir string) (map[string]string, error) {
	ctx := context.Background()
	results := make(map[string]string)

	if targetDir == "" {
		if s.workspace != nil {
			targetDir = filepath.Join(s.workspace.ProjectDir(projectID), "exports")
		} else {
			targetDir = "."
		}
	}

	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create target export directory: %w", err)
	}

	docTypes := []struct {
		dt       domain.DocumentType
		filename string
	}{
		{domain.DocTypePRD, "PRD.md"},
		{domain.DocTypeSRS, "SRS.md"},
		{domain.DocTypeArchitecture, "architecture.md"},
		{domain.DocTypeDesign, "design.md"},
	}

	for _, d := range docTypes {
		doc, err := s.docRepo.GetOrCreate(ctx, projectID, d.dt)
		if err != nil {
			continue
		}
		currVer, err := s.docRepo.GetCurrentVersion(ctx, doc.ID)
		if err != nil || currVer == nil || currVer.Content == "" {
			continue
		}
		outPath := filepath.Join(targetDir, d.filename)
		if err := os.WriteFile(outPath, []byte(currVer.Content), 0644); err == nil {
			results[string(d.dt)] = outPath
		}
	}

	if len(results) == 0 {
		return nil, fmt.Errorf("no generated documents available to export")
	}

	return results, nil
}

func (s *DocumentService) SelectDirectory(title string) (string, error) {
	if s.dialogManager == nil {
		return "", fmt.Errorf("dialog manager unavailable")
	}
	return s.dialogManager.SelectDirectory(title)
}

func (s *DocumentService) SelectSaveFile(title string, defaultFilename string) (string, error) {
	if s.dialogManager == nil {
		return "", fmt.Errorf("dialog manager unavailable")
	}
	return s.dialogManager.SelectSaveFile(title, defaultFilename)
}
