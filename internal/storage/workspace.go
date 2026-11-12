package storage

import (
	"fmt"
	"os"
	"path/filepath"
)

type WorkspaceManager struct {
	rootDir string
}

func NewWorkspaceManager(rootDir string) (*WorkspaceManager, error) {
	if err := os.MkdirAll(rootDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create root workspace %s: %w", rootDir, err)
	}
	return &WorkspaceManager{rootDir: rootDir}, nil
}

func (wm *WorkspaceManager) RootDir() string {
	return wm.rootDir
}

func (wm *WorkspaceManager) ProjectDir(projectID string) string {
	cleanID := filepath.Base(filepath.Clean(projectID))
	if cleanID == "." || cleanID == "/" || cleanID == "\\" || cleanID == ".." || cleanID == "" {
		cleanID = "default"
	}
	projectsBase := filepath.Clean(filepath.Join(wm.rootDir, "projects"))
	target := filepath.Clean(filepath.Join(projectsBase, cleanID))
	if rel, err := filepath.Rel(projectsBase, target); err != nil || (len(rel) >= 2 && rel[:2] == "..") {
		return filepath.Join(projectsBase, "default")
	}
	return target
}

func (wm *WorkspaceManager) InitProjectWorkspace(projectID string) error {
	pDir := wm.ProjectDir(projectID)
	dirs := []string{
		pDir,
		filepath.Join(pDir, "documents", "prd"),
		filepath.Join(pDir, "documents", "srs"),
		filepath.Join(pDir, "documents", "architecture"),
		filepath.Join(pDir, "documents", "design"),
		filepath.Join(pDir, "exports"),
		filepath.Join(pDir, "attachments"),
	}

	for _, d := range dirs {
		if err := os.MkdirAll(d, 0755); err != nil {
			return fmt.Errorf("failed to create directory %s: %w", d, err)
		}
	}

	// Create initial brief.md if it doesn't exist
	briefPath := filepath.Join(pDir, "brief.md")
	if _, err := os.Stat(briefPath); os.IsNotExist(err) {
		_ = os.WriteFile(briefPath, []byte("# Project Brief\n\n"), 0644)
	}

	return nil
}

func (wm *WorkspaceManager) SaveAttachment(projectID, filename string, content []byte) (string, error) {
	pDir := wm.ProjectDir(projectID)
	attachmentsDir := filepath.Join(pDir, "attachments")
	if err := os.MkdirAll(attachmentsDir, 0755); err != nil {
		return "", fmt.Errorf("failed to ensure attachments dir: %w", err)
	}

	// Clean base filename
	safeFilename := filepath.Base(filename)
	targetPath := filepath.Join(attachmentsDir, safeFilename)

	cleanPath := filepath.Clean(targetPath)
	if rel, err := filepath.Rel(attachmentsDir, cleanPath); err != nil || len(rel) >= 2 && rel[:2] == ".." {
		return "", fmt.Errorf("path traversal violation for attachment %s", filename)
	}

	if err := os.WriteFile(cleanPath, content, 0644); err != nil {
		return "", fmt.Errorf("failed to save attachment: %w", err)
	}

	return cleanPath, nil
}

func (wm *WorkspaceManager) ListAttachments(projectID string) ([]string, error) {
	pDir := wm.ProjectDir(projectID)
	attachmentsDir := filepath.Join(pDir, "attachments")
	entries, err := os.ReadDir(attachmentsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return []string{}, nil
		}
		return nil, err
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() {
			files = append(files, e.Name())
		}
	}
	return files, nil
}

func (wm *WorkspaceManager) WriteDocument(projectID, filename string, content []byte) error {
	pDir := wm.ProjectDir(projectID)
	targetPath := filepath.Join(pDir, filename)

	// Clean and ensure path stays within projectDir to prevent path traversal
	cleanPath := filepath.Clean(targetPath)
	if rel, err := filepath.Rel(pDir, cleanPath); err != nil || len(rel) >= 2 && rel[:2] == ".." {
		return fmt.Errorf("path traversal violation for target %s", filename)
	}

	// Atomic file replacement via temp file
	tmpPath := targetPath + ".tmp"
	if err := os.WriteFile(tmpPath, content, 0644); err != nil {
		return fmt.Errorf("failed to write temp file: %w", err)
	}

	if err := os.Rename(tmpPath, targetPath); err != nil {
		_ = os.Remove(tmpPath)
		return fmt.Errorf("failed to replace file %s: %w", targetPath, err)
	}

	return nil
}

func (wm *WorkspaceManager) ReadDocument(projectID, filename string) ([]byte, error) {
	pDir := wm.ProjectDir(projectID)
	targetPath := filepath.Join(pDir, filename)
	cleanPath := filepath.Clean(targetPath)
	if rel, err := filepath.Rel(pDir, cleanPath); err != nil || len(rel) >= 2 && rel[:2] == ".." {
		return nil, fmt.Errorf("path traversal violation for target %s", filename)
	}

	return os.ReadFile(cleanPath)
}
