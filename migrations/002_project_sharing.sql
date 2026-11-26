-- Phase 5: Google-Sheets-style per-project sharing (direct members + general access)
ALTER TABLE projects ADD COLUMN generalAccess TEXT NOT NULL DEFAULT 'restricted';
ALTER TABLE projects ADD COLUMN generalRole TEXT NOT NULL DEFAULT 'viewer';

CREATE TABLE IF NOT EXISTS project_members (
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'viewer',
  addedAt TEXT NOT NULL,
  PRIMARY KEY (projectId, userId)
);

CREATE INDEX IF NOT EXISTS idx_project_members_userId ON project_members(userId);
