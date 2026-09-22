import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

const FIELD_CLASSES =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-ink-text placeholder:text-muted focus:border-brass focus:outline-none focus:ring-2 focus:ring-brass/20 disabled:bg-cream disabled:text-muted";

function FieldWrapper({ label, error, children }: { label?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium text-muted">{label}</span>}
      {children}
      {error && <span className="mt-1 block text-xs text-status-critical">{error}</span>}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = "", ...rest }, ref) => (
  <FieldWrapper label={label} error={error}>
    <input ref={ref} className={`${FIELD_CLASSES} ${className}`} {...rest} />
  </FieldWrapper>
));
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, error, className = "", children, ...rest }, ref) => (
  <FieldWrapper label={label} error={error}>
    <select ref={ref} className={`${FIELD_CLASSES} ${className}`} {...rest}>
      {children}
    </select>
  </FieldWrapper>
));
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, error, className = "", ...rest }, ref) => (
  <FieldWrapper label={label} error={error}>
    <textarea ref={ref} className={`${FIELD_CLASSES} ${className}`} {...rest} />
  </FieldWrapper>
));
Textarea.displayName = "Textarea";
