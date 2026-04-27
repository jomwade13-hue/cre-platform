import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

/**
 * Generic suggestion match.
 *  - `id`: unique key
 *  - `primary`: bold first line (e.g. tenant or property name)
 *  - `secondary`: dimmer second line (e.g. property name)
 *  - `address`: optional small address line displayed with a pin icon
 */
export interface SuggestionItem {
  id: string | number;
  primary: string;
  secondary?: string;
  address?: string;
}

interface Props {
  value: string;
  onChange: (next: string) => void;
  items: SuggestionItem[];
  /** Called when the user picks a suggestion. The picked id is passed in. */
  onSelect: (id: SuggestionItem['id'], item: SuggestionItem) => void;
  placeholder?: string;
  className?: string;
  /** Limit how many suggestions to render. Defaults to 8. */
  maxResults?: number;
  testIdPrefix?: string;
  /** When true, only show the dropdown once the user has typed something. Defaults to true. */
  requireQuery?: boolean;
}

/** Highlight matched substring within a label. */
function highlight(label: string, query: string): React.ReactNode {
  if (!query) return label;
  const idx = label.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm px-0.5">{label.slice(idx, idx + query.length)}</mark>
      {label.slice(idx + query.length)}
    </>
  );
}

export function SearchWithSuggestions({
  value,
  onChange,
  items,
  onSelect,
  placeholder = 'Search…',
  className,
  maxResults = 8,
  testIdPrefix = 'search',
  requireQuery = true,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const matches = useMemo<SuggestionItem[]>(() => {
    const q = value.trim().toLowerCase();
    if (!q && requireQuery) return [];
    if (!q) return items.slice(0, maxResults);
    const ranked: { item: SuggestionItem; score: number }[] = [];
    for (const item of items) {
      const fields = [item.primary, item.secondary || '', item.address || ''];
      let bestScore = -1;
      for (let i = 0; i < fields.length; i++) {
        const idx = fields[i].toLowerCase().indexOf(q);
        if (idx < 0) continue;
        // Earlier matches in earlier fields rank higher.
        const score = (3 - i) * 1000 - idx;
        if (score > bestScore) bestScore = score;
      }
      if (bestScore >= 0) ranked.push({ item, score: bestScore });
    }
    ranked.sort((a, b) => b.score - a.score);
    return ranked.slice(0, maxResults).map(r => r.item);
  }, [items, value, maxResults, requireQuery]);

  // Reset active index whenever the match list changes.
  useEffect(() => { setActiveIdx(0); }, [value, matches.length]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const showDropdown = open && matches.length > 0;

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown) {
      if (e.key === 'ArrowDown' && matches.length > 0) { setOpen(true); e.preventDefault(); }
      return;
    }
    if (e.key === 'ArrowDown') {
      setActiveIdx(i => Math.min(matches.length - 1, i + 1));
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      setActiveIdx(i => Math.max(0, i - 1));
      e.preventDefault();
    } else if (e.key === 'Enter') {
      const pick = matches[activeIdx];
      if (pick) {
        onSelect(pick.id, pick);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
        className="pl-9 h-8 text-sm"
        data-testid={`${testIdPrefix}-input`}
        autoComplete="off"
      />
      {showDropdown && (
        <div
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-md border border-border bg-popover shadow-lg ring-1 ring-black/5"
          role="listbox"
          data-testid={`${testIdPrefix}-suggestions`}
        >
          {matches.map((m, i) => (
            <button
              key={String(m.id)}
              type="button"
              role="option"
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={(e) => {
                // mousedown so the input doesn't lose focus before we handle the click
                e.preventDefault();
                onSelect(m.id, m);
                setOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-xs flex flex-col gap-0.5 transition-colors',
                i === activeIdx ? 'bg-muted' : 'hover:bg-muted/60',
              )}
              data-testid={`${testIdPrefix}-suggestion-${m.id}`}
            >
              <span className="font-medium text-foreground truncate">{highlight(m.primary, value)}</span>
              {m.secondary && (
                <span className="text-muted-foreground truncate">{highlight(m.secondary, value)}</span>
              )}
              {m.address && (
                <span className="text-[10px] text-muted-foreground/80 flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {highlight(m.address, value)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchWithSuggestions;
