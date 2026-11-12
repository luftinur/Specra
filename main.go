package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"ai-requirements-studio/internal/ai"
	"ai-requirements-studio/internal/ai/adapters/antigravity"
	"ai-requirements-studio/internal/ai/adapters/gemini"
	"ai-requirements-studio/internal/ai/adapters/opencode"
	"ai-requirements-studio/internal/services"
	"ai-requirements-studio/internal/storage"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func getWorkspaceDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return filepath.Join(".", "workspace")
	}
	return filepath.Join(home, "AI-Requirements-Studio")
}

func main() {
	workspaceDir := getWorkspaceDir()
	dbPath := filepath.Join(workspaceDir, "app.db")

	// 1. Initialize SQLite Database & Migrations
	db, err := storage.Open(dbPath)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// 2. Initialize Local Workspace Manager
	wm, err := storage.NewWorkspaceManager(workspaceDir)
	if err != nil {
		log.Fatalf("Failed to initialize workspace: %v", err)
	}

	// 3. Initialize Repositories
	projectRepo := storage.NewProjectRepository(db)
	convRepo := storage.NewConversationRepository(db)
	providerRepo := storage.NewProviderRepository(db)
	reqRepo := storage.NewRequirementRepository(db)
	docRepo := storage.NewDocumentRepository(db)
	valRepo := storage.NewValidationRepository(db)

	// 4. Initialize AI Layer & Adapters
	agyAdapter := antigravity.NewAdapter("agy")
	opencodeAdapter := opencode.NewAdapter("opencode", "", "default", "")
	geminiAdapter := gemini.NewAdapter("gemini-1.5-pro", "")

	orchestrator := ai.NewOrchestrator(providerRepo)
	orchestrator.RegisterProvider(agyAdapter)
	orchestrator.RegisterProvider(opencodeAdapter)
	orchestrator.RegisterProvider(geminiAdapter)

	// 5. Initialize Application Services
	agentRegistry := ai.NewAgentRegistry(providerRepo)

	projectService := services.NewProjectService(projectRepo, wm)
	conversationService := services.NewConversationService(convRepo, reqRepo, orchestrator)
	conversationService.SetWorkspace(wm)
	conversationService.SetAgentRegistry(agentRegistry)

	providerService := services.NewProviderService(orchestrator, providerRepo, agyAdapter, opencodeAdapter, geminiAdapter)
	providerService.SetAgentRegistry(agentRegistry)
	providerService.SetWorkspaceDir(workspaceDir)

	requirementService := services.NewRequirementService(reqRepo, convRepo)
	documentService := services.NewDocumentService(docRepo, projectRepo, reqRepo, convRepo, wm, orchestrator)
	validationService := services.NewValidationService(valRepo, docRepo, reqRepo, convRepo)

	// 6. Create Wails v3 Application
	app := application.New(application.Options{
		Name:        "specra",
		Description: "Local-first, chat-first requirements engineering desktop workspace",
		Services: []application.Service{
			application.NewService(projectService),
			application.NewService(conversationService),
			application.NewService(providerService),
			application.NewService(requirementService),
			application.NewService(documentService),
			application.NewService(validationService),
			application.NewService(&GreetService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// 7. Create Main Desktop Window (1200x800 for comfortable 3-pane layout)
	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title:  "specra",
		Width:  1280,
		Height: 800,
		BackgroundColour: application.NewRGB(248, 250, 252), // slate-50
		URL:    "/",
	})

	if err := app.Run(); err != nil {
		log.Fatal(err)
	}
}
