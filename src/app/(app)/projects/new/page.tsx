import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { ActionForm } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/LinkButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createProjectAction } from "@/server/actions/projects";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" subtitle="You become the owner and can invite teammates afterwards." />
      <ActionForm action={createProjectAction}>
        <Field name="name" label="Project name" required maxLength={100} />
        <Field name="description" label="Description" type="textarea" maxLength={1000} hint="Optional. What is this project about?" />
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <SubmitButton pendingLabel="Creating...">Create project</SubmitButton>
          <LinkButton href="/projects" variant="secondary">Cancel</LinkButton>
        </div>
      </ActionForm>
    </>
  );
}
