import React, { useState, useEffect, useRef } from 'react';
import { isValidHex, normalizeHex } from '../../utils/colorUtils';

export interface BrandColorFieldProps {
  label: string;
  description?: string;
  value: string;
  colorKey: string;
  onChange: (normalizedHex: string) => void;
  disabled?: boolean;
}

export const BrandColorField: React.FC<BrandColorFieldProps> = ({
  label,
  description,
  value,
  colorKey,
  onChange,
  disabled = false,
}) => {
  const [draftHex, setDraftHex] = useState(value);
  const colorInputRef = useRef<HTMLInputElement>(null);

  // Synchronize local draft with parent value changes (e.g. preset reset or external change)
  useEffect(() => {
    setDraftHex(value);
  }, [value]);

  const isDraftValid = isValidHex(draftHex);
  const displayColor = isDraftValid ? normalizeHex(draftHex) : (isValidHex(value) ? normalizeHex(value) : '#000000');

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setDraftHex(nextVal);

    if (isValidHex(nextVal)) {
      const normalized = normalizeHex(nextVal);
      onChange(normalized);
    }
  };

  const handleBlur = () => {
    if (isValidHex(draftHex)) {
      const normalized = normalizeHex(draftHex);
      setDraftHex(normalized);
      if (normalized !== value) {
        onChange(normalized);
      }
    } else {
      // Restore last canonical valid color
      setDraftHex(value);
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pickerVal = e.target.value;
    const normalized = normalizeHex(pickerVal);
    setDraftHex(normalized);
    onChange(normalized);
  };

  return (
    <div
      data-testid={`brand-color-field-${colorKey}`}
      className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 shadow-subtle hover:border-slate-300 hover:bg-slate-50 transition-all space-y-2.5"
    >
      {/* Field Label & Subtitle */}
      <div className="space-y-0.5 min-h-[34px]">
        <label
          htmlFor={`hex-input-${colorKey}`}
          className="block text-xs font-bold text-slate-900 cursor-pointer"
        >
          {label}
        </label>
        {description && (
          <p className="text-[10px] text-slate-500 font-mono leading-tight truncate">{description}</p>
        )}
      </div>

      {/* Control Row: 40x40 Swatch + Hex Input */}
      <div className="flex items-center gap-3">
        {/* Large Visual Swatch with Native Color Picker interaction */}
        <div
          data-testid={`brand-color-swatch-container-${colorKey}`}
          className="relative w-10 h-10 min-w-[40px] min-h-[40px] flex-shrink-0 rounded-xl overflow-hidden shadow-sm border border-slate-300 transition-transform active:scale-95 group focus-within:ring-2 focus-within:ring-slate-900 focus-within:ring-offset-1"
        >
          <span
            data-testid={`brand-color-swatch-${colorKey}`}
            className="block w-full h-full"
            style={{ backgroundColor: displayColor }}
            aria-hidden="true"
          />
          <input
            ref={colorInputRef}
            id={`color-picker-${colorKey}`}
            type="color"
            value={isValidHex(displayColor) ? displayColor : '#000000'}
            onChange={handlePickerChange}
            disabled={disabled}
            aria-label={`Choose ${label} color`}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Editable Hex Text Input with Validation Indication */}
        <div className="relative flex-1">
          <input
            id={`hex-input-${colorKey}`}
            type="text"
            value={draftHex}
            onChange={handleTextChange}
            onBlur={handleBlur}
            disabled={disabled}
            aria-label={`${label} Hex Value`}
            placeholder="#000000"
            maxLength={7}
            className={`w-full text-xs font-mono px-3 py-2 border rounded-xl bg-white transition-colors uppercase ${
              isDraftValid
                ? 'border-slate-300 text-slate-900 focus:border-slate-900 focus:ring-1 focus:ring-slate-900'
                : 'border-amber-400 bg-amber-50/40 text-amber-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
            }`}
          />
          {!isDraftValid && (
            <span
              className="absolute right-2.5 top-2 text-[10px] font-mono font-bold text-amber-600 select-none"
              title="Invalid hex color (e.g. #0f172a or #fff)"
            >
              !
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
