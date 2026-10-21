import Link from "next/link";
import styles from "./state.module.css";

export default function NotFound() {
  return (
    <main className={styles.state}>
      <h1 className={styles.heading}>Page not found</h1>
      <p className={styles.text}>The page you opened does not exist or has moved.</p>
      <Link href="/" className={styles.action}>
        Go to the home page
      </Link>
    </main>
  );
}
