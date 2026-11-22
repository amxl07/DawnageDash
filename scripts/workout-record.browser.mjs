/** Actual web dialog with isolated auth/database adapters. No network backend. */
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJourneyDriver } from '../mobile/scripts/journey-driver.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'mobile/docs/review/2026-09-29-selected-ux/evidence/web-compatibility');
const temp = await mkdtemp(path.join(tmpdir(), 'dawnage-workout-browser-'));
await mkdir(output, { recursive: true });
const entry = path.join(root, 'scripts/fixtures/workout-record-browser.tsx');
await build({
  absWorkingDir: root, entryPoints: [entry], outfile: path.join(temp, 'fixture.js'),
  bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@/contexts/AuthContext': entry, '@/lib/supabase': entry, '@': path.join(root, 'client/src') },
});
const cssNames = (await readdir(path.join(root, 'dist/assets'))).filter(name => name.endsWith('.css'));
const css = (await Promise.all(cssNames.map(name => readFile(path.join(root, 'dist/assets', name), 'utf8')))).join('\n');
const js = await readFile(path.join(temp, 'fixture.js'));
const server = createServer((request, response) => {
  response.setHeader('Content-Type', request.url === '/fixture.js' ? 'text/javascript' : request.url === '/style.css' ? 'text/css' : 'text/html');
  response.end(request.url === '/fixture.js' ? js : request.url === '/style.css' ? css : '<!doctype html><html><head><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/fixture.js"></script></body></html>');
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-sync',
  '--remote-debugging-port=0', '--user-data-dir=' + path.join(temp, 'chrome'), 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });
let socket;
let diagnosticDriver;
const report = { fixture: 'actual WorkoutLogDialog; fictional auth/database adapters', checks: [], runtimeErrors: [], screenshots: [] };
try {
  const endpoint = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome startup timed out')), 180000);
    chrome.on('error', reject);
    chrome.stderr.on('data', data => { const match = String(data).match(/DevTools listening on (ws:\/\/[^\s]+)/); if (match) { clearTimeout(timer); resolve(match[1]); } });
  });
  socket = new WebSocket(endpoint);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 90000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(String(event.data));
    const request = pending.get(message.id);
    if (request) { clearTimeout(request.timer); pending.delete(message.id); message.error ? request.reject(new Error(JSON.stringify(message.error))) : request.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') report.runtimeErrors.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text);
  });
  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
  await call('Runtime.enable', {}, sessionId);
  await call('Page.enable', {}, sessionId);
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  const driver = createJourneyDriver(call, sessionId, 90000);
  diagnosticDriver = driver;
  const fixture = expression => driver.evaluate('window.workoutFixture.' + expression);
  const checkpoint = async name => {
    const { data } = await call('Page.captureScreenshot', { format: 'png' }, sessionId);
    await writeFile(path.join(output, name + '.png'), Buffer.from(data, 'base64'));
    report.screenshots.push(name + '.png');
  };
  const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push(name); };
  await call('Page.navigate', { url }, sessionId);
  await driver.expectValue({ css: '#existing-workout-title' }, 'Mobile session A');
  await driver.expectText('Duration (sec)');
  await driver.expectText('Warm-up 1');
  await driver.expectText('Incomplete');
  await driver.expectValue({ label: 'Plank set 1 duration in seconds' }, '60');
  report.checks.push('Mobile duration, warm-up, completion and plan day render in actual dialog');
  await checkpoint('mobile-record');
  await driver.fill({ label: 'Squat set 2 weight in kg' }, '64.75');
  await driver.click({ text: 'Save Workout Log' });
  await driver.waitFor('save closes dialog', async () => !(await fixture('open')));
  const saved = await fixture('rows[0]');
  const expected = await fixture('original'); expected.exercises[1].sets[1].weight = '64.75';
  check('Editing a weight preserves duration, warm-up, completion, plan day and extra metadata', JSON.parse(saved.content), expected);
  check('Update is guarded by exact row, account, date and original content', (await fixture('writes[0].filters')).map(([key]) => key), ['id', 'user_id', 'date', 'content']);
  await new Promise(resolve => setTimeout(resolve, 700));
  check('Fast save cancels the delayed draft write', await driver.evaluate('sessionStorage.getItem("workout-draft:v2:fixture-a:2026-09-29:mobile-a")'), null);

  await fixture('switchRecord("future")');
  await driver.expectValue({ css: '#existing-workout-title' }, 'Future session');
  check('Future record title is disabled', await driver.evaluate('document.querySelector("#existing-workout-title").disabled'));
  check('Future record has no editable set fields', await driver.evaluate('document.querySelectorAll("input[aria-label]").length'), 0);
  await checkpoint('future-read-only');

  await fixture('switchRecord("mobile-b")');
  await driver.expectValue({ css: '#existing-workout-title' }, 'Mobile session B');
  await driver.fill({ label: 'Plank set 1 duration in seconds' }, '90.5');
  await driver.waitFor('scoped local draft', async () => Boolean(await driver.evaluate('sessionStorage.getItem("workout-draft:v2:fixture-a:2026-09-29:mobile-b")')));
  await fixture('switchRecord("mobile-a")');
  await driver.expectValue({ css: '#existing-workout-title' }, 'Mobile session A');
  await fixture('switchRecord("mobile-b")');
  await driver.expectValue({ label: 'Plank set 1 duration in seconds' }, '90.5');
  report.checks.push('Same-day record draft restores only to its owned row');
  await driver.fill({ label: 'Plank set 1 duration in seconds' }, '');
  await driver.waitFor('intermediate cleared duration draft', async () => await driver.evaluate('JSON.parse(sessionStorage.getItem("workout-draft:v2:fixture-a:2026-09-29:mobile-b"))?.exercises[0].sets[0].duration === ""'));
  await fixture('switchRecord("mobile-a")');
  await driver.expectValue({ css: '#existing-workout-title' }, 'Mobile session A');
  await fixture('switchRecord("mobile-b")');
  await driver.expectValue({ label: 'Plank set 1 duration in seconds' }, '');
  await driver.fill({ label: 'Plank set 1 duration in seconds' }, '90.5');
  report.checks.push('Intermediate incomplete numeric edit restores and remains correctable');
  await fixture('switchRecord("mobile-a")');
  await driver.expectValue({ css: '#existing-workout-title' }, 'Mobile session A');
  await fixture('rows[1].content = JSON.stringify({...JSON.parse(window.workoutFixture.rows[1].content), changedElsewhere: true})');
  await fixture('switchRecord("mobile-b")');
  await driver.expectText('Saved draft needs attention');
  check('Changed remote source preserves blocked draft', await driver.evaluate('Boolean(sessionStorage.getItem("workout-draft:v2:fixture-a:2026-09-29:mobile-b"))'));
  await checkpoint('changed-source-draft');
  await driver.click({ text: 'Discard saved draft' });
  await driver.expectValue({ label: 'Plank set 1 duration in seconds' }, '60');

  await fixture('hold = true');
  await driver.fill({ label: 'Squat set 2 weight in kg' }, '70');
  await driver.click({ text: 'Save Workout Log' });
  await driver.waitFor('pending write', async () => (await fixture('writes.length')) === 2);
  await fixture('switchRecord("other-user", "fixture-b")');
  await driver.expectValue({ css: '#existing-workout-title' }, 'Other account session');
  // Populate the new identity draft before releasing the previous account save.
  // Editing may be frozen until completion; the unrelated draft must survive either way.
  await driver.evaluate('sessionStorage.setItem("workout-draft:v2:fixture-b:2026-09-29:other-user", "preserve-unrelated-draft")');
  await fixture('release()');
  await driver.waitFor('old save completes', async () => !(await driver.text()).includes('Saving…'));
  check('Prior account save does not close the newly selected dialog', await fixture('open'));
  check('Prior account save cannot remove another identity draft', await driver.evaluate('sessionStorage.getItem("workout-draft:v2:fixture-b:2026-09-29:other-user")'), 'preserve-unrelated-draft');
  await checkpoint('account-switch-after-save');
  check('No browser runtime exceptions', report.runtimeErrors, []);
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed'; report.error = error.stack;
  if (diagnosticDriver) report.lastVisibleText = await diagnosticDriver.text().catch(() => 'Unavailable');
  throw error;
} finally {
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
  socket?.close(); chrome.kill('SIGTERM'); server.close();
  await rm(temp, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
}
