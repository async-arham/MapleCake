import Link from "next/link";
import styles from "./ui.module.css";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  params?: Record<string, string>;
  noun?: string;
};

export function Pagination({ page, totalPages, total, basePath, params = {}, noun = "result" }: Props) {
  const href = (target: number) => {
    const search = new URLSearchParams(params);
    search.delete("page");
    if (target > 1) search.set("page", String(target));
    const qs = search.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  return (
    <nav className={styles.pagination} aria-label="Pagination">
      <span>
        {total} {noun}
        {total === 1 ? "" : "s"} · Page {Math.min(page, totalPages)} of {totalPages}
      </span>
      <span className={styles.pageLinks}>
        <Link href={href(page - 1)} className={`${styles.btn} ${styles.secondary} ${styles.sm} ${page <= 1 ? styles.disabledLink : ""}`} aria-disabled={page <= 1}>
          Previous
        </Link>
        <Link href={href(page + 1)} className={`${styles.btn} ${styles.secondary} ${styles.sm} ${page >= totalPages ? styles.disabledLink : ""}`} aria-disabled={page >= totalPages}>
          Next
        </Link>
      </span>
    </nav>
  );
}
