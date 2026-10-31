import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

function loadScripts() {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const normalizedRoot = root.replace(/^([A-Za-z]:)\\D:\\/, '$1\\');
  const appJs = fs.readFileSync(path.join(normalizedRoot, 'assets', 'app.js'), 'utf8');
  const demoJs = fs.readFileSync(path.join(normalizedRoot, 'assets', 'demo-data.js'), 'utf8');

  const storage = {};
  const document = {
    readyState: 'complete',
    body: { appendChild() {}, insertBefore() {}, firstChild: null },
    head: { appendChild() {} },
    documentElement: { classList: { add() {} } },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    getElementById() { return null; },
    addEventListener() {},
    createElement() {
      return {
        setAttribute() {},
        classList: { add() {}, remove() {}, toggle() {} },
        querySelectorAll() { return []; },
        querySelector() { return null; },
        appendChild() {},
        addEventListener() {},
        style: {},
        textContent: '',
        innerHTML: ''
      };
    }
  };

  const context = {
    window: {},
    document,
    localStorage: {
      getItem(key) { return storage[key] ?? null; },
      setItem(key, value) { storage[key] = String(value); },
      removeItem(key) { delete storage[key]; }
    },
    sessionStorage: {
      getItem(key) { return storage[key] ?? null; },
      setItem(key, value) { storage[key] = String(value); },
      removeItem(key) { delete storage[key]; }
    },
    URLSearchParams,
    requestAnimationFrame(fn) { fn(); },
    fetch() { return Promise.resolve({ ok: true, json: () => Promise.resolve({}) }); },
    console,
    navigator: { userAgent: 'node' },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    Blob,
    URL,
    FormData,
    location: { pathname: '/official-dashboard.html', search: '', hostname: 'localhost', href: 'http://localhost/official-dashboard.html' }
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(demoJs, context);
  vm.runInContext(appJs, context);
  return context;
}

test('demo mode cannot be started from a frontend-only role selector', () => {
  const context = loadScripts();
  assert.equal(context.LL.startDemoMode, undefined);
  assert.equal(context.LL.getDemoSessionByRole, undefined);
  assert.equal(typeof context.LL.isDemoMode, 'function');
  context.localStorage.setItem('legallense_demo_session_v1', JSON.stringify({ role: 'enforcement_official', demoMode: true }));
  assert.equal(context.LL.getAuthState(), null);
  assert.equal(context.LL.isDemoMode(), false);
});

test('sessionStorage demo UI state is recognized pending server-side session validation', () => {
  const context = loadScripts();
  const demoOfficial = { role: 'enforcement_official', demoMode: true, name: 'Demo Official', email: 'demo.official@example.com' };
  context.sessionStorage.setItem('legallense_session_v1', JSON.stringify(demoOfficial));

  const auth = context.LL.getAuthState();

  assert.equal(auth.authenticated, true);
  assert.equal(auth.role, 'official');
  assert.equal(auth.demoMode, true);
  assert.equal(auth.session.role, 'enforcement_official');
  assert.equal(auth.session.demoMode, true);
  assert.equal(auth.session.name, 'Demo Official');
  assert.equal(auth.session.email, 'demo.official@example.com');
  assert.equal(context.LL.requireAuthenticated(), true);
});

test('demo session UI state must be held in sessionStorage, not trusted from localStorage', () => {
  const context = loadScripts();
  context.localStorage.setItem('legallense_demo_session_v1', JSON.stringify({ role: 'enforcement_official', demoMode: true }));
  assert.equal(context.LL.getSession(), null);
  assert.equal(context.LL.saveDemoScan, undefined);
});

test('manual-review scans remain labeled for verification even with a 100% confirmed score', () => {
  const context = loadScripts();
  const status = context.LL.complianceStatus({ status: 'manual_review', score: 100 });

  assert.equal(status.type, 'manual');
  assert.equal(status.label, 'Manual Verification');
  assert.equal(status.score, 100);
});
