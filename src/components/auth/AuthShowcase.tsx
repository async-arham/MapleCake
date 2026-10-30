"use client";

import { useEffect, useState, type CSSProperties } from "react";
import styles from "@/app/(auth)/auth.module.css";

const slides = [
  {
    title: "Health score",
    text: "One clear 0 to 100 score for every project",
    mock: (
      <>
        <div className={styles.ring}>
          <span className={styles.ringNum}>76</span>
          <span className={styles.mockRow} style={{ flex: 1 }}>Needs watching</span>
        </div>
        <div className={styles.mockRow}>
          <span><i className="ri-bug-line" /> 1 critical bug</span>
          <small>-15</small>
        </div>
        <div className={styles.mockRow}>
          <span><i className="ri-alarm-warning-line" /> 1 overdue task</span>
          <small>-9</small>
        </div>
      </>
    ),
  },
  {
    title: "Kanban board",
    text: "Drag work from To Do all the way to Done",
    mock: (
      <div className={styles.cols}>
        <div className={styles.colMini}>To Do<span className={styles.bar} /><span className={styles.bar} /></div>
        <div className={styles.colMini}>Doing<span className={`${styles.bar} ${styles.y}`} /><span className={`${styles.bar} ${styles.b}`} /></div>
        <div className={styles.colMini}>Done<span className={`${styles.bar} ${styles.g}`} /><span className={`${styles.bar} ${styles.g}`} /></div>
      </div>
    ),
  },
  {
    title: "Teams and roles",
    text: "Invite people and choose what each can do",
    mock: (
      <>
        <div className={styles.stack}>
          <span style={{ background: "#ffe9a8" }}>AK</span>
          <span style={{ background: "#cfe0ff" }}>JS</span>
          <span style={{ background: "#cdeed9" }}>MR</span>
          <span style={{ background: "#ffd5cc" }}>LT</span>
        </div>
        <div className={styles.mockRow}><span><i className="ri-vip-crown-line" /> Owner</span><small style={{ color: "var(--ink-soft)" }}>Full control</small></div>
        <div className={styles.mockRow}><span><i className="ri-eye-line" /> Viewer</span><small style={{ color: "var(--ink-soft)" }}>Read only</small></div>
      </>
    ),
  },
];

const mod = (n: number, m: number) => ((n % m) + m) % m;
/** Cards are drawn at these distances from the middle: two off-screen, two peeking, one in focus. */
const OFFSETS = [-2, -1, 0, 1, 2];

/**
 * An endless carousel. The card before the first one is always the last card (and the other way round),
 * so it never starts or ends with an empty gap. It advances by itself every 4.5 seconds; clicking a dot
 * restarts the countdown. With reduced motion the cards swap instantly instead of sliding.
 */
export function AuthShowcase() {
  const [position, setPosition] = useState(0); // keeps counting up (or down), the cards just repeat
  const count = slides.length;
  const active = mod(position, count);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setPosition((p) => p + 1);
    }, 4500);
    return () => clearInterval(timer);
  }, [position]);

  const goTo = (target: number) => {
    let delta = mod(target - active, count);
    if (delta > count / 2) delta -= count; // take the shorter way round
    setPosition((p) => p + delta);
  };

  return (
    <>
      <div className={styles.viewport} role="group" aria-roledescription="carousel" aria-label="Product preview">
        {OFFSETS.map((offset) => {
          const key = position + offset;
          const slide = slides[mod(key, count)]!;
          return (
            <article key={key} className={`${styles.slide} ${offset === 0 ? styles.slideActive : ""}`} style={{ "--o": offset } as CSSProperties} aria-hidden={offset !== 0}>
              <h2 className={styles.slideTitle}>{slide.title}</h2>
              <p className={styles.slideText}>{slide.text}</p>
              <div className={styles.mock}>{slide.mock}</div>
            </article>
          );
        })}
      </div>
      <div className={styles.dots} role="tablist" aria-label="Preview slides">
        {slides.map((slide, i) => (
          <button key={slide.title} type="button" role="tab" aria-selected={i === active} aria-label={slide.title} className={`${styles.dot} ${i === active ? styles.dotActive : ""}`} onClick={() => goTo(i)} />
        ))}
      </div>
    </>
  );
}
