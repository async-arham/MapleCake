"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { MAX_YEAR, MIN_YEAR, addDays, formatKey, monthGrid, monthLabel, moveByMonths, parseKey, todayKey, weekdayIndex } from "@/lib/calendar";
import styles from "./ui.module.css";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const PANEL_WIDTH = 336;
const PANEL_HEIGHT = 390;

type Props = {
  name?: string;
  id?: string;
  /** "YYYY-MM-DD" or "" for no date. */
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  "aria-describedby"?: string;
};

/**
 * A custom calendar that replaces the browser's date input. The value is submitted as YYYY-MM-DD
 * through a hidden input. Supports the keyboard (arrows, Page Up/Down, Home/End, Escape), a Today
 * shortcut, and clearing the date.
 */
export function DatePicker({ name, id, defaultValue = "", value: controlled, onChange, disabled, invalid, placeholder = "Pick a date", autoFocus, ...aria }: Props) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const hasValue = Boolean(parseKey(value));

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const [focusKey, setFocusKey] = useState(() => (parseKey(value) ? value : todayKey()));

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moveFocus = useRef(false);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openPanel = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    clearTimeout(closeTimer.current);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const up = below < PANEL_HEIGHT && above > below;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8));
    setPos({ left, ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) });
    setFocusKey(parseKey(value) ? value : todayKey());
    moveFocus.current = true;
    setClosing(false);
    setMounted(true);
    setOpen(true);
  }, [disabled, value]);

  const closePanel = useCallback((refocus = false) => {
    setOpen(false);
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 150);
    if (refocus) triggerRef.current?.focus();
  }, []);

  const pick = (next: string) => {
    if (next !== value) {
      if (controlled === undefined) setInner(next);
      onChange?.(next);
      // tell the surrounding form something changed, so "Save" buttons notice
      requestAnimationFrame(() => hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true })));
    }
    closePanel(true);
  };

  useEffect(() => {
    if (!open || !mounted || !moveFocus.current) return;
    moveFocus.current = false;
    panelRef.current?.querySelector<HTMLElement>(`[data-key="${focusKey}"]`)?.focus();
  }, [open, mounted, focusKey]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      closePanel();
    };
    const onScroll = (event: Event) => {
      if (!panelRef.current?.contains(event.target as Node)) closePanel();
    };
    const onResize = () => closePanel();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, closePanel]);

  const goTo = (key: string, focus: boolean) => {
    const p = parseKey(key);
    if (!p || p.y < MIN_YEAR || p.y > MAX_YEAR) return;
    moveFocus.current = focus;
    setFocusKey(key);
  };

  const onPanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).dataset.key ? focusKey : null;
    switch (event.key) {
      case "ArrowLeft": event.preventDefault(); if (target) goTo(addDays(focusKey, -1), true); break;
      case "ArrowRight": event.preventDefault(); if (target) goTo(addDays(focusKey, 1), true); break;
      case "ArrowUp": event.preventDefault(); if (target) goTo(addDays(focusKey, -7), true); break;
      case "ArrowDown": event.preventDefault(); if (target) goTo(addDays(focusKey, 7), true); break;
      case "PageUp": event.preventDefault(); goTo(moveByMonths(focusKey, event.shiftKey ? -12 : -1), Boolean(target)); break;
      case "PageDown": event.preventDefault(); goTo(moveByMonths(focusKey, event.shiftKey ? 12 : 1), Boolean(target)); break;
      case "Home": event.preventDefault(); if (target) goTo(addDays(focusKey, -weekdayIndex(focusKey)), true); break;
      case "End": event.preventDefault(); if (target) goTo(addDays(focusKey, 6 - weekdayIndex(focusKey)), true); break;
      case "Escape": event.preventDefault(); closePanel(true); break;
      case "Tab": closePanel(true); event.preventDefault(); break;
    }
  };

  const view = parseKey(focusKey)!;
  const today = todayKey();
  const cells = monthGrid(view.y, view.m);

  return (
    <>
      {name && <input ref={hiddenRef} type="hidden" name={name} value={hasValue ? value : ""} />}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid || undefined}
        aria-describedby={aria["aria-describedby"]}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`${styles.selectTrigger} ${invalid ? styles.invalid : ""} ${open ? styles.selectOpen : ""}`}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openPanel();
          }
        }}
      >
        <i className="ri-calendar-2-line" aria-hidden="true" />
        <span className={`${styles.selectValue} ${hasValue ? "" : styles.placeholder}`}>{hasValue ? formatKey(value) : placeholder}</span>
        <i className={`ri-arrow-down-s-line ${styles.selectChevron}`} aria-hidden="true" />
      </button>

      {mounted &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a date"
            className={`${styles.calendar} ${pos.bottom !== undefined ? styles.calendarUp : ""} ${closing ? styles.calClosing : ""}`}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom }}
            onKeyDown={onPanelKeyDown}
          >
            <div className={styles.calHead}>
              <button type="button" className={styles.calNav} aria-label="Previous year" onClick={() => goTo(moveByMonths(focusKey, -12), false)}>
                <i className="ri-arrow-left-double-line" aria-hidden="true" />
              </button>
              <button type="button" className={styles.calNav} aria-label="Previous month" onClick={() => goTo(moveByMonths(focusKey, -1), false)}>
                <i className="ri-arrow-left-s-line" aria-hidden="true" />
              </button>
              <div className={styles.calTitle} aria-live="polite">{monthLabel(view.y, view.m)}</div>
              <button type="button" className={styles.calNav} aria-label="Next month" onClick={() => goTo(moveByMonths(focusKey, 1), false)}>
                <i className="ri-arrow-right-s-line" aria-hidden="true" />
              </button>
              <button type="button" className={styles.calNav} aria-label="Next year" onClick={() => goTo(moveByMonths(focusKey, 12), false)}>
                <i className="ri-arrow-right-double-line" aria-hidden="true" />
              </button>
            </div>
            <div className={styles.calWeek} aria-hidden="true">
              {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
            </div>
            <div className={styles.calGrid} role="group" aria-label={monthLabel(view.y, view.m)}>
              {cells.map((cell) => (
                <button
                  key={cell.key}
                  type="button"
                  data-key={cell.key}
                  tabIndex={cell.key === focusKey ? 0 : -1}
                  aria-label={formatKey(cell.key)}
                  aria-pressed={cell.key === value}
                  className={`${styles.day} ${cell.inMonth ? "" : styles.dayOut} ${cell.key === today ? styles.dayToday : ""} ${cell.key === value ? styles.daySelected : ""}`}
                  onClick={() => pick(cell.key)}
                >
                  {cell.day}
                </button>
              ))}
            </div>
            <div className={styles.calFoot}>
              <button type="button" className={`${styles.btn} ${styles.ghost} ${styles.sm}`} onClick={() => pick("")} disabled={!hasValue}>Clear</button>
              <button type="button" className={`${styles.btn} ${styles.secondary} ${styles.sm}`} onClick={() => pick(todayKey())}>Today</button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
