'use client';

import { useState, useEffect, useRef } from 'react';
import { hasAccess } from '@/lib/plan-gates';

const PRESET_TAGS = [
  'GDPR Risk',
  'HIPAA Relevant',
  'SOC 2 Scope',
  'PCI DSS',
  'PIPEDA',
  'CCPA',
];

interface VendorTagButtonProps {
  vendorId: string;
  plan: string;
  initialTags?: { id: string; tag_name: string }[];
}

export function VendorTagButton({ vendorId, plan, initialTags = [] }: VendorTagButtonProps) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(initialTags);
  const [customTag, setCustomTag] = useState('');
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const hasBusiness = hasAccess(plan, 'business');

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleOpen = () => {
    if (!hasBusiness) {
      setOpen(true);
      return;
    }
    setOpen(!open);
  };

  const addTag = async (tagName: string) => {
    if (tags.some((t) => t.tag_name === tagName)) return;
    setLoading(true);
    const res = await fetch('/api/vendor-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor_id: vendorId, tag_name: tagName }),
    });
    const data = await res.json();
    if (res.ok) {
      setTags((prev) => [...prev, data.tag]);
    }
    setLoading(false);
  };

  const removeTag = async (id: string) => {
    setLoading(true);
    await fetch('/api/vendor-tags', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setTags((prev) => prev.filter((t) => t.id !== id));
    setLoading(false);
  };

  const addCustom = async () => {
    const trimmed = customTag.trim();
    if (!trimmed) return;
    await addTag(trimmed);
    setCustomTag('');
  };

  return (
    <div className="vtb-wrap" ref={ref}>
      {tags.length > 0 && (
        <div className="vtb-badges">
          {tags.map((t) => (
            <span key={t.id} className="vtb-badge">{t.tag_name}</span>
          ))}
        </div>
      )}
      <button className="vtb-btn" onClick={handleOpen} title="Manage compliance tags">
        &#9868;
      </button>
      {open && (
        <div className="vtb-dropdown">
          {!hasBusiness ? (
            <div className="vtb-gate">
              <p>Custom compliance categories available on Business plan</p>
              <a href="/pricing" className="pill pill-solid pill-sm">Upgrade &rarr;</a>
            </div>
          ) : (
            <>
              <div className="vtb-title">Compliance Tags</div>
              {tags.length > 0 && (
                <div className="vtb-current">
                  {tags.map((t) => (
                    <span key={t.id} className="vtb-tag-pill">
                      {t.tag_name}
                      <button className="vtb-tag-x" onClick={() => removeTag(t.id)} disabled={loading}>&times;</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="vtb-presets">
                {PRESET_TAGS.filter((p) => !tags.some((t) => t.tag_name === p)).map((preset) => (
                  <button key={preset} className="vtb-preset" onClick={() => addTag(preset)} disabled={loading}>
                    + {preset}
                  </button>
                ))}
              </div>
              <div className="vtb-custom">
                <input
                  type="text"
                  className="vtb-input"
                  placeholder="Custom tag..."
                  maxLength={30}
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                />
                <button className="vtb-add" onClick={addCustom} disabled={loading || !customTag.trim()}>Add</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
