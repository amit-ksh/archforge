"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  type DialogHTMLAttributes,
} from "react";

import styles from "./ui.module.css";
import { cx } from "./utils";

export interface DialogProps extends Omit<DialogHTMLAttributes<HTMLDialogElement>, "open"> {
  description?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: string;
}

export const Dialog = forwardRef<HTMLDialogElement, DialogProps>(function Dialog(
  { children, className, description, onOpenChange, open, title, ...props },
  forwardedRef,
) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useImperativeHandle(forwardedRef, () => dialogRef.current as HTMLDialogElement, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      {...props}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className={cx(styles.dialog, className)}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onOpenChange(false);
      }}
      onClose={() => onOpenChange(false)}
      ref={dialogRef}
    >
      <header className={styles.dialogHeader}>
        <div>
          <h2 className={styles.dialogTitle} id={titleId}>{title}</h2>
          {description ? (
            <p className={styles.dialogDescription} id={descriptionId}>{description}</p>
          ) : null}
        </div>
        <button className={styles.dialogClose} onClick={() => onOpenChange(false)} type="button">
          Close
        </button>
      </header>
      <div className={styles.dialogBody}>{children}</div>
    </dialog>
  );
});
