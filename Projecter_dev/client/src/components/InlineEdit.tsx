import React, { useEffect, useRef, useState } from 'react';

interface InlineEditProps {
  value: string;
  onSave: (newVal: string) => Promise<void> | void;
  style?: React.CSSProperties;
  className?: string;
  /** Element type rendered when not editing. Default: 'span' */
  as?: 'span' | 'h2' | 'h3' | 'h4' | 'strong';
  placeholder?: string;
}

/**
 * Double-click to edit inline. Enter / blur = save. Escape = cancel.
 * Shows a subtle underline on hover to indicate editability.
 */
export function InlineEdit({ value, onSave, style, className, as: Tag = 'span', placeholder }: InlineEditProps) {
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState(value);
  const [saving, setSaving]     = useState(false);
  const inputRef                = useRef<HTMLInputElement>(null);

  // Sync draft when value changes from outside
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const enter = () => {
    setDraft(value);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) { cancel(); return; }
    setSaving(true);
    try {
      await onSave(trimmed);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        disabled={saving}
        onChange={e => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        style={{
          background: 'var(--panel-2)',
          border: '1px solid var(--accent)',
          color: 'var(--text)',
          padding: '2px 6px',
          borderRadius: 4,
          fontSize: 'inherit',
          fontWeight: 'inherit',
          fontFamily: 'inherit',
          lineHeight: 'inherit',
          width: Math.max(120, draft.length * 9),
          opacity: saving ? 0.6 : 1,
          outline: 'none',
          ...style,
        }}
      />
    );
  }

  return (
    <Tag
      onDoubleClick={enter}
      className={className}
      title="Double-click to rename"
      style={{
        cursor: 'text',
        borderBottom: '1px dashed transparent',
        transition: 'border-color 0.15s',
        ...style,
      }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderBottomColor = 'var(--muted)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderBottomColor = 'transparent')}
    >
      {value || placeholder || '—'}
    </Tag>
  );
}
