package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type DB struct {
	*sql.DB
	basePath string
}

func Open(dbPath string) (*DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create db directory %s: %w", dir, err)
	}

	dsn := fmt.Sprintf("%s?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)", dbPath)
	sqlDB, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite connection: %w", err)
	}

	// Optimize connection pooling for SQLite
	sqlDB.SetMaxOpenConns(1) // Avoid database locked in SQLite WAL
	sqlDB.SetMaxIdleConns(1)

	if err := sqlDB.Ping(); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("failed to ping sqlite db: %w", err)
	}

	if err := RunMigrations(sqlDB); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("migration failure: %w", err)
	}

	return &DB{
		DB:       sqlDB,
		basePath: dir,
	}, nil
}

func (db *DB) BasePath() string {
	return db.basePath
}
