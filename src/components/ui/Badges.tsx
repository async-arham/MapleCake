import {
  PRIORITY_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  type ProjectRole,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/lib/constants";
import styles from "./ui.module.css";

const cls = (key: string) => `${styles.badge} ${styles[`b_${key}`] ?? ""}`;

export const PriorityBadge = ({ value }: { value: TaskPriority }) => <span className={cls(value)}>{PRIORITY_LABEL[value]}</span>;
export const StatusBadge = ({ value }: { value: TaskStatus }) => <span className={cls(value)}>{STATUS_LABEL[value]}</span>;
export const TypeBadge = ({ value }: { value: TaskType }) => <span className={cls(value)}>{TYPE_LABEL[value]}</span>;
export const RoleBadge = ({ value }: { value: ProjectRole }) => <span className={cls(value)}>{ROLE_LABEL[value]}</span>;
export const ArchivedBadge = () => <span className={cls("ARCHIVED")}>Archived</span>;
export const OverdueBadge = () => <span className={cls("overdue")}>Overdue</span>;
