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

const PRIORITY_ICON: Record<TaskPriority, string> = { LOW: "ri-arrow-down-line", MEDIUM: "ri-equal-line", HIGH: "ri-arrow-up-line", CRITICAL: "ri-fire-fill" };
const TYPE_ICON: Record<TaskType, string> = { TASK: "ri-checkbox-circle-line", BUG: "ri-bug-line", FEATURE: "ri-lightbulb-flash-line" };
const STATUS_ICON: Record<TaskStatus, string> = { TODO: "ri-circle-line", IN_PROGRESS: "ri-loader-line", IN_REVIEW: "ri-eye-line", DONE: "ri-check-double-line" };
const ROLE_ICON: Record<ProjectRole, string> = { OWNER: "ri-vip-crown-line", ADMIN: "ri-shield-star-line", MEMBER: "ri-user-line", VIEWER: "ri-eye-line" };

const cls = (key: string) => `${styles.badge} ${styles[`b_${key}`] ?? ""}`;
const Badge = ({ k, icon, children }: { k: string; icon: string; children: string }) => (
  <span className={cls(k)}>
    <i className={icon} aria-hidden="true" />
    {children}
  </span>
);

export const PriorityBadge = ({ value }: { value: TaskPriority }) => <Badge k={value} icon={PRIORITY_ICON[value]}>{PRIORITY_LABEL[value]}</Badge>;
export const StatusBadge = ({ value }: { value: TaskStatus }) => <Badge k={value} icon={STATUS_ICON[value]}>{STATUS_LABEL[value]}</Badge>;
export const TypeBadge = ({ value }: { value: TaskType }) => <Badge k={value} icon={TYPE_ICON[value]}>{TYPE_LABEL[value]}</Badge>;
export const RoleBadge = ({ value }: { value: ProjectRole }) => <Badge k={value} icon={ROLE_ICON[value]}>{ROLE_LABEL[value]}</Badge>;
export const ArchivedBadge = () => <Badge k="ARCHIVED" icon="ri-archive-line">Archived</Badge>;
export const OverdueBadge = () => <Badge k="overdue" icon="ri-alarm-warning-line">Overdue</Badge>;
