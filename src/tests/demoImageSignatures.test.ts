import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Demo Image Assets Binary Format & Signature Validation', () => {
  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  const demoDir = path.join(process.cwd(), 'public', 'demo');

  it('should ensure all .png files in public/demo directory have valid PNG magic signature', () => {
    expect(fs.existsSync(demoDir)).toBe(true);
    const files = fs.readdirSync(demoDir).filter((f) => f.endsWith('.png'));
    expect(files.length).toBeGreaterThanOrEqual(4);

    for (const filename of files) {
      const filePath = path.join(demoDir, filename);
      const buffer = fs.readFileSync(filePath);

      // Verify file is not empty
      expect(buffer.length).toBeGreaterThan(100);

      // Check 8-byte PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const signature = Array.from(buffer.subarray(0, 8));
      expect(signature, `File ${filename} must have PNG magic signature`).toEqual(PNG_MAGIC);

      // Verify it does not start with JPEG magic bytes (FF D8)
      expect(buffer[0] === 0xff && buffer[1] === 0xd8, `File ${filename} must not be a JPEG pretending to be PNG`).toBe(false);
    }
  });

  it('should specifically verify the core demo campaign fixtures exist and are valid PNGs', () => {
    const requiredFixtures = [
      'fictional-property-exterior.png',
      'fictional-property-interior.png',
      'multifamily-exterior.png',
      'multifamily-interior.png',
    ];

    for (const fixtureName of requiredFixtures) {
      const filePath = path.join(demoDir, fixtureName);
      expect(fs.existsSync(filePath), `Required fixture ${fixtureName} must exist`).toBe(true);

      const buffer = fs.readFileSync(filePath);
      const signature = Array.from(buffer.subarray(0, 8));
      expect(signature).toEqual(PNG_MAGIC);
    }
  });
});
