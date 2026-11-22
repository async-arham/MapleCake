import type { ActionState } from "@/lib/action-state";
import { ActionForm } from "@/components/ui/ActionForm";
import { Field } from "@/components/ui/Field";
import { LinkButton } from "@/components/ui/LinkButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PRIORITY_LABEL, STATUS_LABEL, TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES, TYPE_LABEL } from "@/lib/constants";
import { toDateInput } from "@/lib/dates";

type Props = {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  projectId: string;
  members: { id: string; name: string }[];
  /** The signed-in person, marked "(You)" in the assignee list. */
  currentUserId?: string;
  task?: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    type: string;
    dueDate: Date | null;
    assigneeId: string | null;
  };
  cancelHref: string;
};

export function TaskForm({ action, projectId, members, currentUserId, task, cancelHref }: Props) {
  const people = [...members].sort((a, b) => Number(b.id === currentUserId) - Number(a.id === currentUserId));
  return (
    <ActionForm action={action} requireChange={Boolean(task)}>
      <input type="hidden" name="projectId" value={projectId} />
      {task && <input type="hidden" name="taskId" value={task.id} />}
      <Field name="title" label="Title" required maxLength={200} defaultValue={task?.title} autoFocus={!task} />
      <Field name="description" label="Description" type="textarea" maxLength={5000} defaultValue={task?.description ?? ""} />
      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
        <Field name="type" label="Type" type="select" defaultValue={task?.type ?? "TASK"} options={TASK_TYPES.map((v) => ({ value: v, label: TYPE_LABEL[v] }))} />
        <Field name="priority" label="Priority" type="select" defaultValue={task?.priority ?? "MEDIUM"} options={TASK_PRIORITIES.map((v) => ({ value: v, label: PRIORITY_LABEL[v] }))} />
        <Field name="status" label="Status" type="select" defaultValue={task?.status ?? "TODO"} options={TASK_STATUSES.map((v) => ({ value: v, label: STATUS_LABEL[v] }))} />
        <Field name="dueDate" label="Due date" type="date" disablePast defaultValue={toDateInput(task?.dueDate)} />
      </div>
      <Field
        name="assigneeId"
        label="Assignee"
        type="select"
        defaultValue={task?.assigneeId ?? ""}
        options={[{ value: "", label: "Unassigned" }, ...people.map((m) => ({ value: m.id, label: m.id === currentUserId ? `(You) ${m.name}` : m.name }))]}
      />
      <div style={{ display: "flex", gap: "0.75rem" }}>
        <SubmitButton>{task ? "Save changes" : "Create task"}</SubmitButton>
        <LinkButton href={cancelHref} variant="secondary">
          {task ? "Back" : "Cancel"}
        </LinkButton>
      </div>
    </ActionForm>
  );
}
