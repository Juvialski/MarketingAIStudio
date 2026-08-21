import { describe, it, expect } from 'vitest';
import {
  calculatePresentationScale,
  CANONICAL_WIDTH,
  CANONICAL_HEIGHT,
  CANONICAL_ASPECT_RATIO,
} from '../features/presentations/bolt/PresentationViewport';

describe('Presentation Viewport Canonical Scaler', () => {
  it('should define canonical 16:9 dimensions', () => {
    expect(CANONICAL_WIDTH).toBe(1600);
    expect(CANONICAL_HEIGHT).toBe(900);
    expect(CANONICAL_ASPECT_RATIO).toBeCloseTo(16 / 9, 5);
  });

  it('should calculate exact scale 1.0 for 1600x900 viewport', () => {
    const scale = calculatePresentationScale(1600, 900);
    expect(scale).toBe(1.0);
  });

  it('should calculate exact scale 0.8 for 1280x720 720p HD viewport', () => {
    const scale = calculatePresentationScale(1280, 720);
    expect(scale).toBe(0.8);
  });

  it('should calculate exact scale 1.2 for 1920x1080 1080p FHD viewport', () => {
    const scale = calculatePresentationScale(1920, 1080);
    expect(scale).toBe(1.2);
  });

  it('should calculate exact scale 1.6 for 2560x1440 2K QHD viewport', () => {
    const scale = calculatePresentationScale(2560, 1440);
    expect(scale).toBe(1.6);
  });

  it('should calculate scale for 1366x768 common laptop viewport', () => {
    const scale = calculatePresentationScale(1366, 768);
    // 768 / 900 = 0.853333...
    // 1366 / 1600 = 0.85375
    // min is 768 / 900
    expect(scale).toBeCloseTo(768 / 900, 4);
  });

  it('should calculate scale and side letterbox for 3440x1440 21:9 ultrawide display', () => {
    const hostWidth = 3440;
    const hostHeight = 1440;
    const scale = calculatePresentationScale(hostWidth, hostHeight);

    expect(scale).toBe(1.6); // bounded by height 1440 / 900

    const scaledWidth = CANONICAL_WIDTH * scale; // 2560
    const scaledHeight = CANONICAL_HEIGHT * scale; // 1440
    const offsetX = (hostWidth - scaledWidth) / 2; // (3440 - 2560) / 2 = 440px
    const offsetY = (hostHeight - scaledHeight) / 2; // 0px

    expect(scaledWidth).toBe(2560);
    expect(scaledHeight).toBe(1440);
    expect(offsetX).toBe(440);
    expect(offsetY).toBe(0);
  });

  it('should calculate scale and top/bottom letterbox for 1920x1200 16:10 display', () => {
    const hostWidth = 1920;
    const hostHeight = 1200;
    const scale = calculatePresentationScale(hostWidth, hostHeight);

    expect(scale).toBe(1.2); // bounded by width 1920 / 1600 = 1.2

    const scaledWidth = CANONICAL_WIDTH * scale; // 1920
    const scaledHeight = CANONICAL_HEIGHT * scale; // 1080
    const offsetX = (hostWidth - scaledWidth) / 2; // 0px
    const offsetY = (hostHeight - scaledHeight) / 2; // (1200 - 1080) / 2 = 60px

    expect(scaledWidth).toBe(1920);
    expect(scaledHeight).toBe(1080);
    expect(offsetX).toBe(0);
    expect(offsetY).toBe(60);
  });

  it('should calculate scale and letterbox for mobile portrait 390x844', () => {
    const hostWidth = 390;
    const hostHeight = 844;
    const scale = calculatePresentationScale(hostWidth, hostHeight);

    // bounded by width: 390 / 1600 = 0.24375
    expect(scale).toBeCloseTo(390 / 1600, 5);

    const scaledWidth = CANONICAL_WIDTH * scale; // 390
    const scaledHeight = CANONICAL_HEIGHT * scale; // 219.375
    const offsetY = (hostHeight - scaledHeight) / 2;

    expect(scaledWidth).toBe(390);
    expect(offsetY).toBeGreaterThan(300);
  });

  it('should calculate scale and letterbox for tablet landscape 1024x768 (4:3)', () => {
    const hostWidth = 1024;
    const hostHeight = 768;
    const scale = calculatePresentationScale(hostWidth, hostHeight);

    // bounded by width: 1024 / 1600 = 0.64
    expect(scale).toBe(0.64);

    const scaledWidth = CANONICAL_WIDTH * scale; // 1024
    const scaledHeight = CANONICAL_HEIGHT * scale; // 576
    const offsetX = (hostWidth - scaledWidth) / 2; // 0px
    const offsetY = (hostHeight - scaledHeight) / 2; // (768 - 576) / 2 = 96px top/bottom letterbox

    expect(scaledWidth).toBe(1024);
    expect(scaledHeight).toBe(576);
    expect(offsetX).toBe(0);
    expect(offsetY).toBe(96);
  });

  it('should calculate scale and letterbox for modern iPad Air/Pro landscape 1180x820', () => {
    const hostWidth = 1180;
    const hostHeight = 820;
    const scale = calculatePresentationScale(hostWidth, hostHeight);

    // bounded by width: 1180 / 1600 = 0.7375
    expect(scale).toBe(0.7375);

    const scaledWidth = CANONICAL_WIDTH * scale; // 1180
    const scaledHeight = CANONICAL_HEIGHT * scale; // 663.75
    const offsetX = (hostWidth - scaledWidth) / 2; // 0px
    const offsetY = (hostHeight - scaledHeight) / 2; // (820 - 663.75) / 2 = 78.125px

    expect(scaledWidth).toBe(1180);
    expect(scaledHeight).toBe(663.75);
    expect(offsetX).toBe(0);
    expect(offsetY).toBeCloseTo(78.125, 2);
  });

  it('should handle zero or negative bounds safely', () => {
    expect(calculatePresentationScale(0, 0)).toBe(1);
    expect(calculatePresentationScale(-100, 500)).toBe(1);
  });
});
