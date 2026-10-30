import Link from "next/link";
import { DuoIcon } from "@/components/ui/DuoIcon";
import styles from "./state.module.css";

export default function NotFound() {
  return (
    <main className={styles.state}>
      <span className={styles.icon} aria-hidden="true">
        <DuoIcon name="compass-3" size="1em" />
      </span>
      <h1 className={styles.heading}>Page not found</h1>
      <p className={styles.text}>The page you opened does not exist or has moved.</p>
      <Link href="/" className={styles.action}>
        <i className="ri-home-4-line" aria-hidden="true" /> Go to the home page
      </Link>
    </main>
  );
}
