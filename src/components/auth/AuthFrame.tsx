import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/app/(auth)/auth.module.css";
import { GithubLink } from "@/components/ui/GithubLink";
import { AuthShowcase } from "./AuthShowcase";
import { BrandLogo } from "@/components/ui/BrandLogo";

type Props = { switchText: string; switchHref: string; switchLabel: string; children: ReactNode };

/** The split screen shared by sign in and register. */
export function AuthFrame({ switchText, switchHref, switchLabel, children }: Props) {
  return (
    <main className={styles.frame}>
      <aside className={styles.showcase}>
        <Link href="/" className={styles.brand}>
          <BrandLogo size="3rem" />
        </Link>
        <p className={styles.welcome}>Welcome to Maplecake</p>
        <AuthShowcase />
        <p className={styles.proof}>
          <i className="ri-shield-check-fill" aria-hidden="true" />
          Private by default. Your projects stay yours.
        </p>
      </aside>
      <section className={styles.panel}>
        <div className={styles.topbar}>
          <Link href="/" className={styles.mobileBrand}>
            <BrandLogo size="2.4rem" />
          </Link>
          <div className={styles.topRight}>
            <p>
              {switchText} <Link href={switchHref}>{switchLabel}</Link>
            </p>
            <GithubLink />
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
