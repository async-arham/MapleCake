"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import { Alert } from "@/components/ui/Alert";
import { STATUS_LABEL, TASK_STATUSES, type TaskPriority, type TaskStatus, type TaskType } from "@/lib/constants";
import { formatDate } from "@/lib/dates";
import { isOverdue } from "@/lib/health";
import { moveTaskAction } from "@/server/actions/tasks";
import styles from "./board.module.css";

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  dueDate: Date | null;
  assignee: { id: string; name: string } | null;
};

type Props = { projectId: string; tasks: BoardTask[]; canEdit: boolean; hiddenDone: number };

export function KanbanBoard({ projectId, tasks, canEdit, hiddenDone }: Props) {
  const [items, applyMove] = useOptimistic(tasks, (current, move: { id: string; status: TaskStatus }) =>
    current.map((t) => (t.id === move.id ? { ...t, status: move.status } : t)),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);

  function move(taskId: string, status: TaskStatus) {
    const task = items.find((t) => t.id === taskId);
    if (!canEdit || !task || task.status === status) return;
    setError(null);
    startTransition(async () => {
      applyMove({ id: taskId, status });
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("taskId", taskId);
      form.set("status", status);
      const result = await moveTaskAction({ ok: false }, form);
      if (!result.ok) setError(result.message ?? "The task could not be moved.");
    });
  }

  return (
    <>
      {canEdit ? (
        <p className={styles.help}>Drag a card to another column, or use the “Move to” menu on a card.</p>
      ) : (
        <p className={styles.help}>You have read-only access, so cards cannot be moved.</p>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <div className={styles.board}>
        {TASK_STATUSES.map((status) => {
          const column = items.filter((t) => t.status === status);
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              className={`${styles.column} ${overColumn === status ? styles.columnOver : ""}`}
              onDragOver={(e) => {
                if (!canEdit) return;
                e.preventDefault();
                setOverColumn(status);
              }}
              onDragLeave={() => setOverColumn((c) => (c === status ? null : c))}
              onDrop={(e) => {
                e.preventDefault();
                setOverColumn(null);
                const id = e.dataTransfer.getData("text/plain");
                if (id) move(id, status);
                setDragId(null);
              }}
            >
              <h3 id={`col-${status}`} className={styles.colHead}>
                {STATUS_LABEL[status]}
                <span className={styles.colCount}>{column.length}</span>
              </h3>
              {column.length === 0 ? (
                <p className={styles.emptyCol}>No tasks</p>
              ) : (
                <ul className={styles.cards}>
                  {column.map((task) => {
                    const late = task.status !== "DONE" && isOverdue(task);
                    return (
                      <li
                        key={task.id}
                        className={`${styles.card} ${canEdit ? styles.draggable : ""} ${dragId === task.id ? styles.dragging : ""}`}
                        draggable={canEdit}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", task.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragId(task.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverColumn(null);
                        }}
                      >
                        <Link href={`/projects/${projectId}/tasks/${task.id}`} className={styles.title}>
                          {task.title}
                        </Link>
                        <div className={styles.meta}>
                          <TypeBadge value={task.type} />
                          <PriorityBadge value={task.priority} />
                        </div>
                        <div className={styles.meta}>
                          {task.dueDate && <span className={late ? styles.late : undefined}>{late ? "Overdue · " : "Due "}{formatDate(task.dueDate)}</span>}
                          <span>{task.assignee?.name ?? "Unassigned"}</span>
                        </div>
                        {canEdit && (
                          <select
                            className={styles.move}
                            aria-label={`Move “${task.title}” to another column`}
                            value={task.status}
                            onChange={(e) => move(task.id, e.target.value as TaskStatus)}
                          >
                            {TASK_STATUSES.map((s) => (
                              <option key={s} value={s}>
                                Move to: {STATUS_LABEL[s]}
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
              {status === "DONE" && hiddenDone > 0 && (
                <p className={styles.note}>Showing the latest 25. {hiddenDone} older completed tasks are in the Tasks list.</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
