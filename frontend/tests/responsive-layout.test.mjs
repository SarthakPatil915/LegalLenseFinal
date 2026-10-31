import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readFrontendFile = (name) => fs.readFileSync(path.join(frontendRoot, name), 'utf8');

test('shared shell uses an accessible off-canvas drawer on tablet and mobile without hiding overflow', () => {
  const shellCss = readFrontendFile('assets/shell.css');
  const shellJs = readFrontendFile('assets/shell.js');

  assert.match(shellCss, /@media\(max-width:900px\)/);
  assert.doesNotMatch(shellCss, /body\.ll-shell[^}]*overflow-x\s*:\s*hidden/);
  assert.match(shellJs, /aria-controls="ll-sidebar"/);
  assert.match(shellJs, /sidebar\.inert = !open/);
  assert.match(shellJs, /overlay\.addEventListener\("click", closeSidebar\)/);
  assert.match(shellJs, /event\.key === "Escape"/);
  assert.match(shellJs, /shell\.css\?v=20261031-7/);
  assert.match(shellJs, /!sidebar\.contains\(event\.target\) && !toggle\.contains\(event\.target\)/);
  assert.match(shellJs, /event\.key === "Tab"/);
});

test('dashboard provides compact summary cards and mobile recent-scan cards', () => {
  const dashboard = readFrontendFile('official-dashboard.html');

  assert.match(dashboard, /dashboard-stat-grid/);
  assert.match(dashboard, /dashboard-content w-full flex-1 min-w-0/);
  assert.doesNotMatch(dashboard, /ml-\[260px\]/);
  assert.match(dashboard, /dashboard-recent-cards/);
  assert.match(dashboard, /dashboard-recent-table/);
  assert.match(dashboard, /dashboard-view-report/);
  assert.match(dashboard, /Compliance score/);
});

test('shared-shell official pages do not retain duplicate desktop sidebar offsets', () => {
  const pages = [
    'case-details.html',
    'compliance-report.html',
    'compliance-summary.html',
    'new-compliance-scan.html',
    'new-self-check.html',
    'review-queue.html',
    'revision-history.html',
    'self-check-report.html'
  ];

  for (const page of pages) {
    assert.doesNotMatch(readFrontendFile(page), /ml-\[260px\]/, `${page} should rely on the shared shell for sidebar spacing`);
  }
});

test('history provides complete mobile record cards and responsive filters', () => {
  const history = readFrontendFile('scan-history.html');

  assert.match(history, /id="history-cards"/);
  assert.match(history, /history-record-actions/);
  assert.match(history, /Scan date and time/);
  assert.match(history, /Product category/);
  assert.match(history, /Manufacturer/);
  assert.match(history, /Compliance score/);
  assert.match(history, /history-filters\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}/);
  assert.match(history, /\.history-table-scroll\{display:none\}/);
});

test('products and settings pages constrain controls and stack layouts on narrow screens', () => {
  const products = readFrontendFile('products.html');
  const settings = readFrontendFile('settings.html');

  assert.match(products, /products-search-grid/);
  assert.match(products, /product-filter-label/);
  assert.match(products, /products-scan-link/);
  assert.match(products, /flex-direction:column;align-items:stretch/);
  assert.match(settings, /settings-content/);
  assert.match(settings, /settings-notification/);
  assert.match(settings, /settings-save/);
  assert.match(settings, /@media\(max-width:900px\)/);
});
