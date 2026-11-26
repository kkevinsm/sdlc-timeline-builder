-- Phase 6: Spreadsheet-style Show Changes history log
CREATE TABLE IF NOT EXISTS project_changes (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  pageId INTEGER,
  pageName TEXT,
  targetLabel TEXT NOT NULL,
  fieldLabel TEXT NOT NULL,
  oldValue TEXT,
  newValue TEXT,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_changes_proj ON project_changes(projectId, createdAt DESC);
