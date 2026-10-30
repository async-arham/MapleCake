"use client";

import Link from "next/link";
import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { PriorityBadge, TypeBadge } from "@/components/ui/Badges";
import { useDialogs } from "@/components/ui/DialogProvider";
import { Select } from "@/components/ui/Select";
import { STATUS_LABEL, TASK_STATUSES, type TaskPriority, type TaskStatus, type TaskType } from "@/lib/constants";
import { formatDate, initials } from "@/lib/dates";
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

const STATUS_ICON: Record<TaskStatus, string> = { TODO: "ri-circle-line", IN_PROGRESS: "ri-loader-line", IN_REVIEW: "ri-eye-line", DONE: "ri-check-double-line" };
const MOVE_OPTIONS = TASK_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s], icon: STATUS_ICON[s] }));

// Touch screens: long-press dragging competes with scrolling the board sideways, so cards are moved with the "Move to" menu instead.
const touchQuery = "(pointer: coarse)";
const subscribeTouch = (notify: () => void) => {
  const query = window.matchMedia(touchQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const isTouch = () => window.matchMedia(touchQuery).matches;
const notTouch = () => false;

type Props = { projectId: string; tasks: BoardTask[]; canEdit: boolean; hiddenDone: number };

export function KanbanBoard({ projectId, tasks, canEdit, hiddenDone }: Props) {
  const [items, applyMove] = useOptimistic(tasks, (current, move: { id: string; status: TaskStatus }) =>
    current.map((t) => (t.id === move.id ? { ...t, status: move.status } : t)),
  );
  const { notify } = useDialogs();
  const [, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<TaskStatus | null>(null);
  const touch = useSyncExternalStore(subscribeTouch, isTouch, notTouch);
  const canDrag = canEdit && !touch;

  function move(taskId: string, status: TaskStatus) {
    const task = items.find((t) => t.id === taskId);
    if (!canEdit || !task || task.status === status) return;
    startTransition(async () => {
      applyMove({ id: taskId, status });
      const form = new FormData();
      form.set("projectId", projectId);
      form.set("taskId", taskId);
      form.set("status", status);
      const result = await moveTaskAction({ ok: false }, form);
      if (!result.ok) void notify({ tone: "error", title: "Couldn't move the task", message: result.message ?? "Something went wrong. Please try again." });
    });
  }

  return (
    <>
      {canEdit ? (
        <p className={styles.help}><i className="ri-drag-move-2-line" aria-hidden="true" /> {touch ? "Use the “Move to” menu on a card to change its column." : "Drag a card to another column, or use the “Move to” menu on a card."}</p>
      ) : (
        <p className={styles.help}><i className="ri-lock-line" aria-hidden="true" /> You have read-only access, so cards cannot be moved.</p>
      )}
      <div className={styles.board}>
        {TASK_STATUSES.map((status) => {
          const column = items.filter((t) => t.status === status);
          return (
            <section
              key={status}
              aria-labelledby={`col-${status}`}
              className={`${styles.column} ${styles[`c_${status}`]} ${overColumn === status ? styles.columnOver : ""}`}
              onDragOver={(e) => {
                if (!canDrag) return;
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
                <span className={styles.dot} aria-hidden="true" />
                {STATUS_LABEL[status]}
                <span className={styles.colCount}>{column.length}</span>
              </h3>
              {column.length === 0 ? (
                <p className={styles.emptyCol}><i className="ri-inbox-line" aria-hidden="true" />No tasks</p>
              ) : (
                <ul className={styles.cards}>
                  {column.map((task) => {
                    const late = task.status !== "DONE" && isOverdue(task);
                    return (
                      <li
                        key={task.id}
                        className={`${styles.card} ${canDrag ? styles.draggable : ""} ${dragId === task.id ? styles.dragging : ""}`}
                        draggable={canDrag}
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
                        <div className={styles.footer}>
                          {task.dueDate ? (
                            <span className={`${styles.due} ${late ? styles.late : ""}`}>
                              <i className={late ? "ri-alarm-warning-line" : "ri-calendar-line"} aria-hidden="true" />
                              {late ? "Overdue · " : ""}
                              {formatDate(task.dueDate)}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span className={styles.person} title={task.assignee?.name ?? "Unassigned"}>
                            <span className={`${styles.avatar} ${task.assignee ? "" : styles.avatarEmpty}`} aria-hidden="true">
                              {task.assignee ? initials(task.assignee.name) : <i className="ri-user-line" />}
                            </span>
                            <span className="visually-hidden">{task.assignee?.name ?? "Unassigned"}</span>
                          </span>
                        </div>
                        {canEdit && (
                          <Select
                            compact
                            triggerLabel="Move to"
                            triggerIcon="ri-arrow-left-right-line"
                            aria-label={`Move “${task.title}” to another column`}
                            value={task.status}
                            onChange={(next) => move(task.id, next as TaskStatus)}
                            options={MOVE_OPTIONS}
                          />
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
