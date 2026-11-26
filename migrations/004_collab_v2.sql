-- Phase 7: Task comments with @mentions & snapshotData for version restore
ALTER TABLE project_changes ADD COLUMN snapshotData TEXT;

CREATE TABLE IF NOT EXISTS task_comments (
  id TEXT PRIMARY KEY NOT NULL,
  projectId TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rowId TEXT NOT NULL,
  userId TEXT NOT NULL,
  userName TEXT NOT NULL,
  body TEXT NOT NULL,
  mentions TEXT NOT NULL DEFAULT '[]',
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_task_comments_proj ON task_comments(projectId, rowId, createdAt ASC);
