'use client';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search vendors...' }: SearchBarProps) {
  return (
    <div className="search-bar">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder=""
        aria-label="Search vendors"
      />
      {!value && (
        <span className="search-placeholder">
          {placeholder}<span className="search-cursor">_</span>
        </span>
      )}
    </div>
  );
}
