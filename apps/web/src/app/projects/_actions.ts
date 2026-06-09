"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getApiClientWithAuth } from "@/lib/api";
import { getActorUserId } from "@/lib/actor";
import type { ProjectStatus } from "@stoneboyz/domain";

export async function createProjectAction(formData: FormData) {
  const client = await getApiClientWithAuth();
  const ownerUserId = await getActorUserId();

  const customerId = formData.get("customerId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const jobTemplateId = formData.get("jobTemplateId") as string;

  const { data, error } = await client.POST("/projects", {
    body: {
      customerId,
      title,
      jobTemplateId,
      ownerUserId,
      ...(description ? { description } : {}),
    },
  });

  if (error) {
    throw new Error("Failed to create project: " + JSON.stringify(error));
  }

  redirect(`/projects/${data.id}`);
}

export async function quickCreateAccountAction(formData: FormData) {
  const client = await getApiClientWithAuth();
  const ownerUserId = await getActorUserId();

  const name = ((formData.get("name") as string) ?? "").trim();
  const kind = formData.get("customerKind") as "company" | "person";

  if (!name) {
    throw new Error("Account name is required");
  }

  const base = {
    ownerUserId,
    name,
    status: "active" as const,
    type: "customer" as const,
  };

  const body =
    kind === "company"
      ? { ...base, customerKind: "company" as const, companyName: name }
      : (() => {
          const [firstName = name, ...rest] = name.split(/\s+/);
          return {
            ...base,
            customerKind: "person" as const,
            firstName,
            ...(rest.length > 0 ? { lastName: rest.join(" ") } : {}),
          };
        })();

  const { data, error } = await client.POST("/customers", { body });

  if (error) {
    throw new Error("Failed to create account: " + JSON.stringify(error));
  }

  redirect(`/projects/new?customerId=${data.id}`);
}

export async function updateProjectAction(
  projectId: string,
  formData: FormData,
) {
  const client = await getApiClientWithAuth();

  const customerId = formData.get("customerId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const status = formData.get("status") as ProjectStatus;

  const { error } = await client.PATCH("/projects/{projectId}", {
    params: { path: { projectId } },
    body: {
      customerId,
      title,
      status,
      description: description ? description : null,
    },
  });

  if (error) {
    throw new Error("Failed to update project: " + JSON.stringify(error));
  }

  revalidatePath(`/projects/${projectId}`);
  redirect(`/projects/${projectId}`);
}

export async function archiveProjectAction(projectId: string) {
  const client = await getApiClientWithAuth();

  const { error } = await client.POST("/projects/{projectId}/archive", {
    params: { path: { projectId } },
    body: {},
  });

  if (error) {
    throw new Error("Failed to archive project: " + JSON.stringify(error));
  }

  redirect("/projects");
}
