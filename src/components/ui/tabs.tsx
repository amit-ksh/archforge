"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";

import styles from "./ui.module.css";
import { cx } from "./utils";

interface TabsContextValue {
  baseId: string;
  onValueChange: (value: string) => void;
  value: string;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext(): TabsContextValue {
  const context = useContext(TabsContext);
  if (!context) throw new Error("Tab components must be rendered inside Tabs.");
  return context;
}

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  onValueChange: (value: string) => void;
  value: string;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(function Tabs(
  { children, className, onValueChange, value, ...props },
  ref,
) {
  const baseId = useId();

  return (
    <TabsContext.Provider value={{ baseId, onValueChange, value }}>
      <div {...props} className={cx(styles.tabs, className)} ref={ref}>{children}</div>
    </TabsContext.Provider>
  );
});

export interface TabsListProps extends HTMLAttributes<HTMLDivElement> {
  "aria-label": string;
}

function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;

  const tabs = Array.from(
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)'),
  );
  const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
  if (currentIndex < 0 || tabs.length === 0) return;

  event.preventDefault();
  let nextIndex = currentIndex;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;

  tabs[nextIndex]?.focus();
  tabs[nextIndex]?.click();
}

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(function TabsList(
  { className, onKeyDown, ...props },
  ref,
) {
  return (
    <div
      {...props}
      className={cx(styles.tabsList, className)}
      onKeyDown={(event) => {
        handleListKeyDown(event);
        onKeyDown?.(event);
      }}
      ref={ref}
      role="tablist"
    />
  );
});

export interface TabsTriggerProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  value: string;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  function TabsTrigger({ className, onClick, value, ...props }, ref) {
    const context = useTabsContext();
    const selected = context.value === value;

    return (
      <button
        {...props}
        aria-controls={`${context.baseId}-panel-${value}`}
        aria-selected={selected}
        className={cx(styles.tabTrigger, className)}
        id={`${context.baseId}-tab-${value}`}
        onClick={(event) => {
          context.onValueChange(value);
          onClick?.(event);
        }}
        ref={ref}
        role="tab"
        tabIndex={selected ? 0 : -1}
        type="button"
      />
    );
  },
);

export interface TabsPanelProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsPanel = forwardRef<HTMLDivElement, TabsPanelProps>(function TabsPanel(
  { children, className, value, ...props },
  ref,
) {
  const context = useTabsContext();
  const selected = context.value === value;

  return (
    <div
      {...props}
      aria-labelledby={`${context.baseId}-tab-${value}`}
      className={cx(styles.tabPanel, className)}
      hidden={!selected}
      id={`${context.baseId}-panel-${value}`}
      ref={ref}
      role="tabpanel"
      tabIndex={0}
    >
      {children}
    </div>
  );
});
