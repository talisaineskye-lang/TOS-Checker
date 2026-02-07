'use client';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="search-wrap">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search vendors..."
        autoComplete="off"
        spellCheck={false}
        aria-label="Search vendors"
      />
    </div>
  );
}
