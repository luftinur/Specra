package storage

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-requirements-studio/internal/domain"
)

func setupTestDB(t *testing.T) (*DB, func()) {
	tmpDir, err := os.MkdirTemp("", "req_studio_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	dbPath := filepath.Join(tmpDir, "test.db")
	db, err := Open(dbPath)
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("failed to open test db: %v", err)
	}

	cleanup := func() {
		db.Close()
		os.RemoveAll(tmpDir)
	}
	return db, cleanup
}

func TestProjectRepository_CRUD(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	repo := NewProjectRepository(db)

	p := &domain.Project{
		ID:          "p-100",
		Name:        "Test Store",
		Description: "A test project",
		Status:      domain.ProjectStatusActive,
	}

	// 1. Create
	if err := repo.Create(ctx, p); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// 2. Get
	fetched, err := repo.Get(ctx, "p-100")
	if err != nil {
		t.Fatalf("failed to get project: %v", err)
	}
	if fetched.Name != "Test Store" {
		t.Errorf("expected name 'Test Store', got '%s'", fetched.Name)
	}

	// 3. Update
	fetched.Name = "Updated Test Store"
	if err := repo.Update(ctx, fetched); err != nil {
		t.Fatalf("failed to update project: %v", err)
	}

	updated, _ := repo.Get(ctx, "p-100")
	if updated.Name != "Updated Test Store" {
		t.Errorf("expected updated name, got '%s'", updated.Name)
	}

	// 4. List
	list, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("failed to list projects: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 project in list, got %d", len(list))
	}

	// 5. Delete
	if err := repo.Delete(ctx, "p-100"); err != nil {
		t.Fatalf("failed to delete project: %v", err)
	}
	_, err = repo.Get(ctx, "p-100")
	if err == nil {
		t.Errorf("expected error when getting deleted project, got nil")
	}
}

func TestConversationRepository_Messages(t *testing.T) {
	db, cleanup := setupTestDB(t)
	defer cleanup()

	ctx := context.Background()
	pRepo := NewProjectRepository(db)
	cRepo := NewConversationRepository(db)

	// Create project first
	p := &domain.Project{ID: "p-200", Name: "Chat Project"}
	if err := pRepo.Create(ctx, p); err != nil {
		t.Fatalf("failed to create project: %v", err)
	}

	// Get or create conversation session
	conv, err := cRepo.GetOrCreateForProject(ctx, "p-200", "Initial Discovery")
	if err != nil {
		t.Fatalf("failed to get or create conversation: %v", err)
	}
	if conv.ProjectID != "p-200" {
		t.Errorf("expected project ID 'p-200', got '%s'", conv.ProjectID)
	}

	// Add messages
	userMsg := &domain.Message{
		ID:             "msg-1",
		ConversationID: conv.ID,
		Role:           domain.RoleUser,
		Content:        "Hello requirement assistant",
	}
	if err := cRepo.AddMessage(ctx, userMsg); err != nil {
		t.Fatalf("failed to add message: %v", err)
	}

	msgs, err := cRepo.ListMessages(ctx, conv.ID)
	if err != nil {
		t.Fatalf("failed to list messages: %v", err)
	}
	if len(msgs) != 1 || msgs[0].Content != "Hello requirement assistant" {
		t.Errorf("unexpected messages: %+v", msgs)
	}
}

func TestWorkspaceManager(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "workspace_test_*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	wm, err := NewWorkspaceManager(tmpDir)
	if err != nil {
		t.Fatalf("failed to create workspace manager: %v", err)
	}

	pID := "proj-xyz"
	if err := wm.InitProjectWorkspace(pID); err != nil {
		t.Fatalf("failed to init project workspace: %v", err)
	}

	// Verify brief.md
	briefData, err := wm.ReadDocument(pID, "brief.md")
	if err != nil {
		t.Fatalf("failed to read brief.md: %v", err)
	}
	if len(briefData) == 0 {
		t.Errorf("expected brief.md to contain initial content")
	}

	// Atomic write and read
	docContent := []byte("# PRD Draft v1\n\nContent here")
	if err := wm.WriteDocument(pID, "PRD.md", docContent); err != nil {
		t.Fatalf("failed to write PRD.md: %v", err)
	}

	readContent, err := wm.ReadDocument(pID, "PRD.md")
	if err != nil {
		t.Fatalf("failed to read PRD.md: %v", err)
	}
	if string(readContent) != string(docContent) {
		t.Errorf("content mismatch")
	}

	// Security: Prevent path traversal in documents
	err = wm.WriteDocument(pID, "../../escaped.txt", []byte("danger"))
	if err == nil {
		t.Errorf("expected path traversal violation, got nil")
	}

	// Security: Prevent path traversal in projectID
	evilDir := wm.ProjectDir("../../../system32")
	cleanRoot := filepath.Clean(tmpDir)
	if !strings.HasPrefix(evilDir, filepath.Join(cleanRoot, "projects")) {
		t.Errorf("expected evil projectDir to remain confined within projects dir, got: %s", evilDir)
	}
}
