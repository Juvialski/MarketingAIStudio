import { describe, it, expect } from 'vitest';
import { validateDesignLayout, FORMAT_SAFE_ZONES } from '../services/export/designPreflight';

describe('Design Preflight & Safe Zone Validation', () => {
  it('defines valid safe zones for all formats', () => {
    expect(FORMAT_SAFE_ZONES.story.top).toBe(160);
    expect(FORMAT_SAFE_ZONES.story.bottom).toBe(250);
    expect(FORMAT_SAFE_ZONES.square.top).toBe(40);
    expect(FORMAT_SAFE_ZONES.portrait.top).toBe(40);
    expect(FORMAT_SAFE_ZONES.landscape.top).toBe(30);
  });

  it('detects stray separator characters at the end of text', () => {
    const div = document.createElement('div');
    div.dataset.targetWidth = '1080';
    div.dataset.targetHeight = '1080';
    div.style.width = '1080px';
    div.style.height = '1080px';

    const h1 = document.createElement('h1');
    h1.textContent = 'Phoenix Value-Add Opportunity |';
    div.appendChild(h1);
    document.body.appendChild(div);

    try {
      const result = validateDesignLayout(div, 'square');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('stray separator'))).toBe(true);
    } finally {
      document.body.removeChild(div);
    }
  });

  it('passes on clean DOM layout within boundaries', () => {
    const div = document.createElement('div');
    div.dataset.targetWidth = '1080';
    div.dataset.targetHeight = '1080';
    div.style.width = '1080px';
    div.style.height = '1080px';

    const h1 = document.createElement('h1');
    h1.textContent = 'Phoenix Value-Add Opportunity';
    div.appendChild(h1);
    document.body.appendChild(div);

    try {
      const result = validateDesignLayout(div, 'square');
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    } finally {
      document.body.removeChild(div);
    }
  });
});
