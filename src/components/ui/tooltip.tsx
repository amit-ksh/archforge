"use client";

import {
  cloneElement,
  useId,
  type ReactElement,
} from "react";

import styles from "./ui.module.css";

interface TooltipTriggerProps {
  "aria-describedby"?: string;
}

export interface TooltipProps {
  children: ReactElement<TooltipTriggerProps>;
  label: string;
}

export function Tooltip({ children, label }: TooltipProps) {
  const id = useId();
  const describedBy = [children.props["aria-describedby"], id].filter(Boolean).join(" ");

  return (
    <span className={styles.tooltip}>
      {cloneElement(children, { "aria-describedby": describedBy })}
      <span className={styles.tooltipContent} id={id} role="tooltip">{label}</span>
    </span>
  );
}
