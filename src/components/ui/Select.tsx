"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import styles from "./ui.module.css";

export type SelectOption = { value: string; label: string; icon?: string };

type Props = {
  options: SelectOption[];
  name?: string;
  id?: string;
  defaultValue?: string;
  /** Controlled value. Leave out to let the dropdown manage itself. */
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Smaller trigger, for toolbars and cards. */
  compact?: boolean;
  /** Always show this text on the button instead of the chosen option (e.g. "Move to..."). */
  triggerLabel?: string;
  triggerIcon?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
  "aria-describedby"?: string;
};

type Position = { left: number; width: number; top?: number; bottom?: number; maxHeight: number };

/**
 * A clean custom dropdown that replaces the browser's <select>.
 * Works inside forms (it submits through a hidden input), supports keyboard and type-ahead,
 * opens over scrollable areas, flips upward near the bottom of the screen, and animates smoothly.
 */
export function Select({ options, name, id, defaultValue, value: controlled, onChange, disabled, invalid, compact, triggerLabel, triggerIcon, autoFocus, ...aria }: Props) {
  const autoId = useId();
  const triggerId = id ?? autoId;
  const listId = `${triggerId}-list`;
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? "");
  const value = controlled ?? inner;
  const selected = options.find((o) => o.value === value) ?? options[0];

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const typed = useRef({ text: "", timer: undefined as ReturnType<typeof setTimeout> | undefined });

  useEffect(() => () => {
    clearTimeout(closeTimer.current);
    clearTimeout(typed.current.timer);
  }, []);

  const openMenu = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect || disabled) return;
    clearTimeout(closeTimer.current);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const wanted = Math.min(options.length * 44 + 12, 300);
    const up = below < wanted && above > below;
    setPos({
      left: Math.min(rect.left, Math.max(8, window.innerWidth - Math.max(rect.width, 176) - 8)),
      width: Math.max(rect.width, 176),
      maxHeight: Math.max(120, Math.min(300, up ? above : below)),
      ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setClosing(false);
    setMounted(true);
    setOpen(true);
  }, [disabled, options, value]);

  const closeMenu = useCallback((refocus = false) => {
    setOpen(false);
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, 150);
    if (refocus) triggerRef.current?.focus();
  }, []);

  /** Change the value and tell the surrounding form, so "Save" buttons notice the edit. */
  const select = (next: string) => {
    if (next === value) return;
    if (controlled === undefined) setInner(next);
    onChange?.(next);
    requestAnimationFrame(() => hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true })));
  };
  const choose = (next: string) => {
    select(next);
    closeMenu(true);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };
    const onScroll = (event: Event) => {
      if (!menuRef.current?.contains(event.target as Node)) closeMenu();
    };
    const onResize = () => closeMenu();
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (open) menuRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        event.preventDefault();
        if (!open) openMenu();
        else setActive((a) => (event.key === "ArrowDown" ? Math.min(last, a + 1) : Math.max(0, a - 1)));
        break;
      case "Home":
      case "End":
        if (open) {
          event.preventDefault();
          setActive(event.key === "Home" ? 0 : last);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) openMenu();
        else if (options[active]) choose(options[active].value);
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          closeMenu(true);
        }
        break;
      case "Tab":
        if (open) closeMenu();
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const t = typed.current;
          clearTimeout(t.timer);
          t.text += event.key.toLowerCase();
          t.timer = setTimeout(() => (t.text = ""), 600);
          const index = options.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
          if (index >= 0) {
            if (open) setActive(index);
            else select(options[index]!.value);
          }
        }
    }
  };

  const shownIcon = triggerIcon ?? selected?.icon;
  return (
    <>
      {name && <input ref={hiddenRef} type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-label={aria["aria-label"]}
        aria-describedby={aria["aria-describedby"]}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`${styles.selectTrigger} ${compact ? styles.selectCompact : ""} ${invalid ? styles.invalid : ""} ${open ? styles.selectOpen : ""}`}
        onClick={(event) => {
          if (event.detail === 0) return; // keyboard activation is handled in onKeyDown
          if (open) closeMenu();
          else openMenu();
        }}
        onKeyDown={onKeyDown}
      >
        {shownIcon && <i className={shownIcon} aria-hidden="true" />}
        <span className={styles.selectValue}>{triggerLabel ?? selected?.label}</span>
        <i className={`ri-arrow-down-s-line ${styles.selectChevron}`} aria-hidden="true" />
      </button>
      {mounted &&
        pos &&
        createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={aria["aria-label"] ?? "Options"}
            className={`${styles.menu} ${pos.bottom !== undefined ? styles.menuUp : ""} ${closing ? styles.menuClosing : ""}`}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={option.value === value}
                className={`${styles.option} ${index === active ? styles.optionActive : ""} ${option.value === value ? styles.optionSelected : ""}`}
                style={{ "--i": index } as React.CSSProperties}
                onPointerEnter={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => choose(option.value)}
              >
                {option.icon && <i className={option.icon} aria-hidden="true" />}
                <span>{option.label}</span>
                {option.value === value && <i className={`ri-check-line ${styles.optionCheck}`} aria-hidden="true" />}
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </>
  );
}
