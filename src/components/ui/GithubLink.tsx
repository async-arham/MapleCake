import styles from "./ui.module.css";

/** Icon-only link to the maker's GitHub. Used on the home page footer and the sign-in pages only. */
export function GithubLink() {
  return (
    <a href="https://github.com/async-arham" target="_blank" rel="noopener noreferrer" className={styles.githubIcon} aria-label="GitHub profile (opens in a new tab)" title="GitHub">
      <i className="ri-github-fill" aria-hidden="true" />
    </a>
  );
}
