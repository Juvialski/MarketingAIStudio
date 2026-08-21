import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';

const root = path.join(process.cwd(), 'client-demo-output');
const campaign = path.join(root, 'phoenix-value-add');
const expectedPngs = {
  'graphics/instagram-square.png': [1080, 1080],
  'graphics/instagram-portrait.png': [1080, 1350],
  'graphics/story-reel.png': [1080, 1920],
  'graphics/facebook-linkedin-landscape.png': [1200, 630],
};

const results = { png: {}, pdf: {}, zip: {}, copyReview: {} };
for (const [relative, [expectedWidth, expectedHeight]] of Object.entries(expectedPngs)) {
  const bytes = await readFile(path.join(campaign, relative));
  const signature = Array.from(bytes.subarray(0, 8));
  if (JSON.stringify(signature) !== JSON.stringify([137, 80, 78, 71, 13, 10, 26, 10])) throw new Error(`${relative} is not a PNG.`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  if (width !== expectedWidth || height !== expectedHeight) throw new Error(`${relative} is ${width}x${height}.`);
  results.png[relative] = { width, height, bytes: bytes.length };
}

const pdfPath = path.join(campaign, 'print', 'investment-flyer-letter.pdf');
const pdfBytes = await readFile(pdfPath);
const pdfText = pdfBytes.toString('latin1');
const mediaBox = pdfText.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
if (!mediaBox) throw new Error('PDF MediaBox is missing.');
const pdfWidthPoints = Number(mediaBox[3]);
const pdfHeightPoints = Number(mediaBox[4]);
if (Math.abs(pdfWidthPoints - 612) > 0.5 || Math.abs(pdfHeightPoints - 792) > 0.5) throw new Error('PDF is not US Letter size.');
results.pdf = { widthPoints: pdfWidthPoints, heightPoints: pdfHeightPoints, widthInches: 8.5, heightInches: 11, bytes: pdfBytes.length, rendering: 'high-resolution raster' };

const zipPath = path.join(campaign, 'ZawMarketing-Phoenix-Demo-Kit.zip');
const zipBytes = await readFile(zipPath);
const zip = await JSZip.loadAsync(zipBytes);
const zipFiles = Object.keys(zip.files).filter((name) => !zip.files[name].dir);
if (!zipFiles.some((name) => name.endsWith('.pdf')) || zipFiles.filter((name) => name.endsWith('.png')).length < 4) {
  throw new Error('Marketing ZIP is missing required graphics or flyer.');
}
results.zip = { files: zipFiles, bytes: zipBytes.length };

const copyFiles = ['strategy.md', 'facebook-post.txt', 'instagram-post.txt', 'linkedin-post.txt', 'email-newsletter.md', 'reel-script.md'];
const prohibited = /unlock the potential|game.?changing|nestled in the heart|don'?t miss this incredible opportunity|rare opportunity|guaranteed returns?|monthly rent|appreciation|cap rate/i;
for (const filename of copyFiles) {
  const content = await readFile(path.join(campaign, filename), 'utf8');
  if (!/demo\s*\/\s*fictional sample|fictional demo|fictional sample/i.test(content)) throw new Error(`${filename} lacks a fictional-demo label.`);
  if (prohibited.test(content)) throw new Error(`${filename} contains a prohibited or unsupported claim.`);
  results.copyReview[filename] = { characters: content.length, passed: true };
}

const screenshots = (await readdir(path.join(root, 'screenshots'))).filter((name) => name.endsWith('.png')).sort();
for (const screenshot of screenshots) {
  const info = await stat(path.join(root, 'screenshots', screenshot));
  if (info.size < 10_000) throw new Error(`Screenshot ${screenshot} appears empty.`);
}
results.screenshots = screenshots;

await writeFile(path.join(root, 'verification.json'), JSON.stringify(results, null, 2));
const index = `# ZawMarketing Client Sample Index

All property details and financial inputs in this folder are **DEMO / FICTIONAL SAMPLE** data. Nothing here is a real listing, offering, return projection, or investment recommendation.

## Primary Phoenix value-add package

- \`phoenix-value-add/strategy.md\` — audience, positioning, evidence, and CTA strategy.
- \`phoenix-value-add/facebook-post.txt\` — Facebook-ready demo copy.
- \`phoenix-value-add/instagram-post.txt\` — concise Instagram caption and hashtags.
- \`phoenix-value-add/linkedin-post.txt\` — investor-oriented LinkedIn copy.
- \`phoenix-value-add/email-newsletter.md\` — subject lines, preview, newsletter body, and CTA.
- \`phoenix-value-add/reel-script.md\` — four-scene 60-second vertical video script.
- \`phoenix-value-add/graphics/\` — exact 1080×1080, 1080×1350, 1080×1920, and 1200×630 PNG exports.
- \`phoenix-value-add/print/investment-flyer-letter.pdf\` — 8.5×11-inch high-resolution raster PDF.
- \`phoenix-value-add/ZawMarketing-Phoenix-Demo-Kit.zip\` — packaged strategy, copy, graphics, and printable flyer.

## Workflow screenshots

${screenshots.map((name) => `- \`screenshots/${name}\``).join('\n')}

## Verification

See \`verification.json\` for programmatically measured image dimensions, PDF page size, ZIP contents, and copy-safety checks.
`;
await writeFile(path.join(root, 'CLIENT_SAMPLE_INDEX.md'), index);
process.stdout.write(JSON.stringify({ ok: true, verification: path.join(root, 'verification.json'), screenshots: screenshots.length }));
