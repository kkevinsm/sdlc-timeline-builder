import { createAuthClient } from "better-auth/react";
import type { ProjectData } from "@/types/timeline";

export const authClient = createAuthClient({
  basePath: "/api/auth",
});

export type MemberRole = "owner" | "editor" | "viewer";

export interface CloudProjectMeta {
  id: string;
  name: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  role?: MemberRole;
  version?: number;
  lastEditedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  ownerId: string;
  role: MemberRole;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  userId: string;
  name: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

export interface WorkspaceInvite {
  id: string;
  email: string | null;
  role: "editor" | "viewer";
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface WorkspaceDetail {
  workspace: {
    id: string;
    name: string;
    ownerId: string;
  };
  myRole: MemberRole;
  members: WorkspaceMember[];
  invites: WorkspaceInvite[];
}

export async function fetchHealthStatus(): Promise<{
  ok: boolean;
  googleEnabled: boolean;
}> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return { ok: false, googleEnabled: false };
    return (await res.json()) as { ok: false; googleEnabled: boolean };
  } catch {
    return { ok: false, googleEnabled: false };
  }
}

export async function listCloudProjects(): Promise<CloudProjectMeta[]> {
  const res = await fetch("/api/projects", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load cloud projects");
  const json = (await res.json()) as { projects: CloudProjectMeta[] };
  return json.projects || [];
}

export async function saveCloudProject(
  id: string | null,
  project: ProjectData,
  opts?: { workspaceId?: string | null; expectedVersion?: number }
): Promise<{
  id: string;
  name: string;
  workspaceId?: string | null;
  version: number;
  updatedAt: string;
}> {
  const res = await fetch("/api/projects", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: id || undefined,
      name: project.pages[0]?.title || project.name || "Timeline Project",
      workspaceId: opts?.workspaceId,
      expectedVersion: opts?.expectedVersion,
      data: project,
    }),
  });
  if (res.status === 409) {
    throw new Error("CONFLICT");
  }
  if (!res.ok) throw new Error("Failed to save cloud project");
  return (await res.json()) as {
    id: string;
    name: string;
    workspaceId?: string | null;
    version: number;
    updatedAt: string;
  };
}

export async function loadCloudProject(id: string): Promise<{
  id: string;
  name: string;
  workspaceId?: string | null;
  role?: MemberRole;
  version?: number;
  lastEditedBy?: string | null;
  data: ProjectData;
}> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load cloud project");
  return (await res.json()) as {
    id: string;
    name: string;
    workspaceId?: string | null;
    role?: MemberRole;
    version?: number;
    lastEditedBy?: string | null;
    data: ProjectData;
  };
}

export async function deleteCloudProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete cloud project");
}

export async function listWorkspaces(): Promise<WorkspaceSummary[]> {
  const res = await fetch("/api/workspaces", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to load workspaces");
  const json = (await res.json()) as { workspaces: WorkspaceSummary[] };
  return json.workspaces || [];
}

export async function createWorkspace(name: string): Promise<WorkspaceSummary> {
  const res = await fetch("/api/workspaces", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error("Failed to create workspace");
  const json = (await res.json()) as { workspace: WorkspaceSummary };
  return json.workspace;
}

export async function getWorkspaceDetail(wsId: string): Promise<WorkspaceDetail> {
  const res = await fetch(`/api/workspaces/${encodeURIComponent(wsId)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch workspace details");
  return (await res.json()) as WorkspaceDetail;
}

export async function createWorkspaceInvite(
  wsId: string,
  role: "editor" | "viewer",
  email?: string
): Promise<WorkspaceInvite> {
  const res = await fetch(
    `/api/workspaces/${encodeURIComponent(wsId)}/invites`,
    {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role, email: email?.trim() || undefined }),
    }
  );
  if (!res.ok) throw new Error("Failed to create invite");
  const json = (await res.json()) as { invite: WorkspaceInvite };
  return json.invite;
}

export async function revokeWorkspaceInvite(
  wsId: string,
  inviteId: string
): Promise<void> {
  const res = await fetch(
    `/api/workspaces/${encodeURIComponent(wsId)}/invites/${encodeURIComponent(inviteId)}`,
    { method: "DELETE", credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to revoke invite");
}

export async function updateMemberRole(
  wsId: string,
  memberId: string,
  role: "editor" | "viewer"
): Promise<void> {
  const res = await fetch(
    `/api/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    }
  );
  if (!res.ok) throw new Error("Failed to update role");
}

export async function removeWorkspaceMember(
  wsId: string,
  memberId: string
): Promise<void> {
  const res = await fetch(
    `/api/workspaces/${encodeURIComponent(wsId)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE", credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to remove member");
}

export async function acceptWorkspaceInvite(token: string): Promise<{
  workspaceId: string;
  workspaceName: string;
  role: MemberRole;
}> {
  const res = await fetch(
    `/api/invites/${encodeURIComponent(token)}/accept`,
    { method: "POST", credentials: "include" }
  );
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || "Failed to accept invite");
  }
  return (await res.json()) as {
    workspaceId: string;
    workspaceName: string;
    role: MemberRole;
  };
}
