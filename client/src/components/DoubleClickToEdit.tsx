import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * DoubleClickToEdit
 * ------------------------------------------------------------------
 * Wraps a value in a span. Double-click switches to an inline input.
 * Enter or blur saves; Escape cancels and reverts.
 *
 * Designed to feel like Excel/Notion: the cell looks the same in
 * read mode, but a subtle hover hint lets the user know they can
 * double-click to edit. Works for text, numbers, and dates.
 */

export type DoubleClickEditType = 'text' | 'number' | 'date';

export interface DoubleClickToEditProps {
  value: string | number | null | undefined;
  onSave: (next: string) => void;
  type?: DoubleClickEditType;
  /** Optional formatter applied only in display mode (e.g. currency, % ). */
  display?: (value: string | number | null | undefined) => React.ReactNode;
  /** Placeholder shown when value is empty. */
  placeholder?: string;
  /** Tailwind class names for the display span. */
  className?: string;
  /** Tailwind class names for the input element. */
  inputClassName?: string;
  /** Disable editing entirely (still renders the value). */
  disabled?: boolean;
  /** Optional ARIA label for the input. */
  ariaLabel?: string;
  /** Test id for both the trigger span and the input. */
  testId?: string;
  /** If true, allow multiline editing via textarea. */
  multiline?: boolean;
}

export function DoubleClickToEdit({
  value,
  onSave,
  type = 'text',
  display,
  placeholder = '—',
  className,
  inputClassName,
  disabled = false,
  ariaLabel,
  testId,
  multiline = false,
}: DoubleClickToEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editing) setDraft(value == null ? '' : String(value));
  }, [value, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // Select existing value so users can type to replace
      if ('select' in inputRef.current) inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (disabled) return;
    setDraft(value == null ? '' : String(value));
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    if (draft !== (value == null ? '' : String(value))) {
      onSave(draft);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value == null ? '' : String(value));
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (editing) {
    const sharedProps = {
      ref: inputRef as any,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKey,
      'aria-label': ariaLabel,
      'data-testid': testId ? `input-edit-${testId}` : undefined,
      className: cn(
        'w-full bg-background border border-primary/60 ring-2 ring-primary/20 rounded px-1.5 py-0.5 text-sm outline-none',
        inputClassName,
      ),
    } as const;

    if (multiline) {
      return <textarea rows={2} {...(sharedProps as any)} />;
    }
    return <input type={type} {...(sharedProps as any)} />;
  }

  const isEmpty = value == null || value === '';
  return (
    <span
      onDoubleClick={startEdit}
      role={disabled ? undefined : 'button'}
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'F2' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          startEdit();
        }
      }}
      title={disabled ? undefined : 'Double-click to edit'}
      data-testid={testId ? `editable-${testId}` : undefined}
      className={cn(
        'inline-block min-h-[1.25rem] rounded px-1 -mx-1 transition-colors',
        !disabled && 'hover:bg-primary/5 focus-visible:bg-primary/10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-primary/40 cursor-text',
        isEmpty && 'text-muted-foreground italic',
        className,
      )}
    >
      {isEmpty ? placeholder : display ? display(value) : String(value)}
    </span>
  );
}

export default DoubleClickToEdit;
