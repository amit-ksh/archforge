import {
  forwardRef,
  useId,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import styles from "./ui.module.css";
import { cx } from "./utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "default" | "compact";

const buttonVariantClass: Record<ButtonVariant, string> = {
  primary: styles.buttonPrimary,
  secondary: styles.buttonSecondary,
  ghost: styles.buttonGhost,
  danger: styles.buttonDanger,
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    busy = false,
    children,
    className,
    disabled,
    size = "default",
    type = "button",
    variant = "primary",
    ...props
  },
  ref,
) {
  return (
    <button
      {...props}
      aria-busy={busy || undefined}
      className={cx(
        styles.button,
        buttonVariantClass[variant],
        size === "compact" && styles.buttonCompact,
        className,
      )}
      disabled={disabled || busy}
      ref={ref}
      type={type}
    >
      {busy ? <span aria-hidden="true" className={styles.busyIndicator} /> : null}
      {children}
    </button>
  );
});

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  children: ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ className, type = "button", ...props }, ref) {
    return (
      <button
        {...props}
        className={cx(styles.iconButton, className)}
        ref={ref}
        type={type}
      />
    );
  },
);

interface FieldShellProps {
  children: ReactNode;
  error?: string;
  helperText?: string;
  id: string;
  label: string;
  required?: boolean;
}

function FieldShell({ children, error, helperText, id, label, required }: FieldShellProps) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
        {required ? <span aria-hidden="true" className={styles.requiredMark}>*</span> : null}
      </label>
      {children}
      {helperText ? (
        <p className={styles.helperText} id={`${id}-helper`}>
          {helperText}
        </p>
      ) : null}
      {error ? (
        <p className={styles.errorText} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

interface FieldOptions {
  error?: string;
  helperText?: string;
  label: string;
}

function describedBy(
  id: string,
  helperText: string | undefined,
  error: string | undefined,
  supplied: string | undefined,
): string | undefined {
  return [supplied, helperText && `${id}-helper`, error && `${id}-error`]
    .filter(Boolean)
    .join(" ") || undefined;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldOptions;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { "aria-describedby": ariaDescribedBy, className, error, helperText, id, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell error={error} helperText={helperText} id={inputId} label={label} required={required}>
      <input
        {...props}
        aria-describedby={describedBy(inputId, helperText, error, ariaDescribedBy)}
        aria-invalid={error ? true : undefined}
        className={cx(styles.fieldControl, error && styles.fieldError, className)}
        id={inputId}
        ref={ref}
        required={required}
      />
    </FieldShell>
  );
});

export type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & FieldOptions;

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { "aria-describedby": ariaDescribedBy, className, error, helperText, id, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell error={error} helperText={helperText} id={inputId} label={label} required={required}>
      <textarea
        {...props}
        aria-describedby={describedBy(inputId, helperText, error, ariaDescribedBy)}
        aria-invalid={error ? true : undefined}
        className={cx(styles.fieldControl, styles.textArea, error && styles.fieldError, className)}
        id={inputId}
        ref={ref}
        required={required}
      />
    </FieldShell>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldOptions;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { "aria-describedby": ariaDescribedBy, children, className, error, helperText, id, label, required, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <FieldShell error={error} helperText={helperText} id={inputId} label={label} required={required}>
      <select
        {...props}
        aria-describedby={describedBy(inputId, helperText, error, ariaDescribedBy)}
        aria-invalid={error ? true : undefined}
        className={cx(styles.fieldControl, error && styles.fieldError, className)}
        id={inputId}
        ref={ref}
        required={required}
      >
        {children}
      </select>
    </FieldShell>
  );
});
