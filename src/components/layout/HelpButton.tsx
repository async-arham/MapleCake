"use client";

import { useEffect, useState } from "react";
import { DuoIcon } from "@/components/ui/DuoIcon";
import { Modal } from "@/components/ui/Modal";
import ui from "@/components/ui/ui.module.css";
import { CRITICAL_BUG_CAP, CRITICAL_BUG_POINTS, OVERDUE_CAP, OVERDUE_WEIGHT } from "@/lib/health";
import styles from "./shell.module.css";

/** Fired by the account menu on phones, where the round "?" button is hidden. */
export const HELP_EVENT = "maplecake:help";

/** The round "?" button at the bottom right (desktop). Opens a short guide to the health score. */
export function HelpButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(HELP_EVENT, show);
    return () => window.removeEventListener(HELP_EVENT, show);
  }, []);
  return (
    <>
      <button type="button" className={styles.help} aria-label="Help: how the health score works" onClick={() => setOpen(true)}>
        <i className="ri-question-mark" aria-hidden="true" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        wide
        title="How the health score works"
        icon={<DuoIcon name="heart-pulse" size="3.8rem" />}
        actions={
          <button type="button" data-autofocus className={`${ui.btn} ${ui.dark}`} onClick={() => setOpen(false)}>
            Got it
          </button>
        }
      >
        <p>Every project starts at 100. Two things take points away:</p>
        <ul style={{ paddingLeft: "1.2rem" }}>
          <li>
            <strong>Overdue tasks:</strong> low {OVERDUE_WEIGHT.LOW}, medium {OVERDUE_WEIGHT.MEDIUM}, high {OVERDUE_WEIGHT.HIGH}, critical {OVERDUE_WEIGHT.CRITICAL} points each (50% more after a week). Capped at {OVERDUE_CAP}.
          </li>
          <li>
            <strong>Unresolved critical bugs:</strong> {CRITICAL_BUG_POINTS} points each. Capped at {CRITICAL_BUG_CAP}.
          </li>
        </ul>
        <p>80 and above is healthy, 60 to 79 needs watching, 40 to 59 is at risk, and below 40 is critical.</p>
      </Modal>
    </>
  );
}
