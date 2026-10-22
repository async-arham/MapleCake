import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/LinkButton";

export default function ProjectNotFound() {
  return (
    <EmptyState title="Project not found" action={<LinkButton href="/projects">Back to projects</LinkButton>}>
      It may have been deleted, or you may not have access to it.
    </EmptyState>
  );
}
