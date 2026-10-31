import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readFrontendFile = (name) => fs.readFileSync(path.join(frontendRoot, name), 'utf8');

test('landing page offers only Enforcement Official Login', () => {
  const home = readFrontendFile('home.html');

  assert.match(home, /Enforcement Official Login/);
  assert.doesNotMatch(home, /Manufacturer\?|registration\.html|Create an account/i);
  assert.match(home, /w-full sm:w-auto[^>]*onclick="location\.href='login\.html'"/);
});

test('login page exposes only the official email/password API form', () => {
  const login = readFrontendFile('login.html');

  assert.match(login, /aria-label="Enforcement Official sign in"/);
  assert.match(login, /LLAuth\.login\(\{ email: identifier, password: password, role: 'official' \}\)/);
  assert.match(login, /Explore Demo/);
  assert.match(login, /LLAuth\.createDemoSession\(\)/);
  assert.match(login, /assets\/auth-client\.js\?v=20261031-2/);
  assert.match(login, /No registration required/);
  assert.match(login, /Create New Account/);
  assert.match(login, /href="forgot-password\.html"/);
  assert.match(login, /aria-label="Show password"/);
  assert.match(login, />\s*Secure Login\s*</);
  assert.doesNotMatch(login, /Manufacturer (?:Login|Sign in)|manufacturer-login/i);
  assert.equal((login.match(/<form\b/g) || []).length, 1);
});

test('new account registration uses only the existing email-verified manufacturer workflow', () => {
  const registration = readFrontendFile('registration.html');

  assert.match(registration, /Create New Account/);
  assert.match(registration, /registration-layout[\s\S]*max-width: 680px/);
  assert.match(registration, /registration-card[\s\S]*border-radius: 16px/);
  assert.match(registration, /registration-info[\s\S]*Manufacturer accounts are verified by email/);
  assert.match(registration, /LLAuth\.signup\(\{/);
  assert.match(registration, /role: 'manufacturer'/);
  assert.match(registration, /verify-email\.html\?email=/);
  assert.match(registration, /Enforcement Official accounts are provisioned/);
  assert.match(registration, /confirm-password/);
  assert.match(registration, /data-password-toggle="password"/);
  assert.match(registration, /data-password-toggle="confirm-password"/);
  assert.match(registration, /registration-spinner/);
  assert.match(registration, /prefers-reduced-motion: reduce/);
  assert.match(registration, /grid-template-columns: minmax\(0, 1fr\)/);
});

test('official login uses the HTTPS production authentication API', async () => {
  const requests = [];
  const authClient = readFrontendFile('assets/auth-client.js');
  const context = {
    location: { hostname: 'legallense-sih-frontend.vercel.app', pathname: '/login.html' },
    fetch(url, options) {
      requests.push({ url, options });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ user: { role: 'official' } }) });
    }
  };
  context.window = context;
  vm.runInNewContext(authClient, context);

  await context.LLAuth.login({ email: 'official@example.gov', password: 'test-password', role: 'official' });

  assert.equal(requests[0].url, 'https://legallens-lil2.onrender.com/api/auth/login');
  assert.equal(requests[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(requests[0].options.body), {
    email: 'official@example.gov',
    password: 'test-password',
    role: 'official'
  });
  assert.equal(requests[0].options.credentials, 'include');
});
