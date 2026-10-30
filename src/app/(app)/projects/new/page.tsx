import type { Metadata } from "next";
import { PageHeader } from "@/components/layout/PageHeader";
import { NewProjectScreen } from "@/components/projects/NewProjectScreen";
import { createProjectAction } from "@/server/actions/projects";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <>
      <PageHeader title="New project" subtitle="You become the owner and can invite teammates afterwards." />
      <NewProjectScreen action={createProjectAction} />
    </>
  );
}
