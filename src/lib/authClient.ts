import { createAuthClient } from "better-auth/react";
import type { ProjectData } from "@/types/timeline";

export const authClient = createAuthClient({
  basePath: "/api/auth",
});

export interface CloudProjectMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchHealthStatus(): Promise<{
  ok: boolean;
  googleEnabled: boolean;
}> {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) return { ok: false, googleEnabled: false };
    return (await res.json()) as { ok: boolean; googleEnabled: boolean };
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
  project: ProjectData
): Promise<{ id: string; name: string; updatedAt: string }> {
  const res = await fetch("/api/projects", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: id || undefined,
      name: project.pages[0]?.title || project.name || "Timeline Project",
      data: project,
    }),
  });
  if (!res.ok) throw new Error("Failed to save cloud project");
  return (await res.json()) as { id: string; name: string; updatedAt: string };
}

export async function loadCloudProject(id: string): Promise<{
  id: string;
  name: string;
  data: ProjectData;
}> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load cloud project");
  return (await res.json()) as { id: string; name: string; data: ProjectData };
}

export async function deleteCloudProject(id: string): Promise<void> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete cloud project");
}
