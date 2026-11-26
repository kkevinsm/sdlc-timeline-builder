CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  ownerId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joinedAt TEXT NOT NULL,
  PRIMARY KEY (workspaceId, userId)
);

CREATE TABLE IF NOT EXISTS workspace_invites (
  id TEXT PRIMARY KEY NOT NULL,
  workspaceId TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('editor', 'viewer')),
  token TEXT NOT NULL UNIQUE,
  invitedBy TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  expiresAt TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

ALTER TABLE projects ADD COLUMN workspaceId TEXT REFERENCES workspaces(id) ON DELETE CASCADE;
ALTER TABLE projects ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN lastEditedBy TEXT;

CREATE INDEX IF NOT EXISTS idx_projects_ws ON projects(workspaceId, updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_ws_members_user ON workspace_members(userId);
CREATE INDEX IF NOT EXISTS idx_ws_invites_token ON workspace_invites(token);
