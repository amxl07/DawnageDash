/** Actual web assessment advance/finish regression check. No live backend. */
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
const reviewedSource = process.argv.includes('--reviewed-source');
const compatibilitySource = process.argv.includes('--compat-reviewed-source');
const output = path.join(root, 'mobile/docs/review/2026-10-03-cleanup-implementation/' + (reviewedSource ? 'web-assessment-red' : compatibilitySource ? 'web-assessment-compat-red' : 'web-assessment-final'));
const temp = await mkdtemp(path.join(tmpdir(), 'dawnage-assessment-browser-'));
await mkdir(output, { recursive: true });
const entry = path.join(root, 'scripts/fixtures/assessment-cleanup-browser.tsx');
await build({
  absWorkingDir: root, entryPoints: [entry], outfile: path.join(temp, 'fixture.js'),
  bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  alias: { '@/contexts/AuthContext': entry, '@/lib/supabase': entry, '@/hooks/use-toast': entry, '@': path.join(root, 'client/src') },
  plugins: reviewedSource || compatibilitySource ? [{ name: 'reviewed-wizard-regression', setup(builder) {
    builder.onLoad({ filter: /client\/src\/components\/QuestionnaireWizard\.tsx$/ }, async () => ({
      contents: await readFile('/tmp/dawnage-cleanup-2026-10-03/' + (compatibilitySource ? 'phase-3-snapshot' : 'phase-2-review-snapshot') + '/client/src/components/QuestionnaireWizard.tsx', 'utf8'),
      loader: 'tsx', resolveDir: path.join(root, 'client/src/components'),
    }));
  } }] : [],
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
const report = { fixture: 'actual QuestionnaireWizard; fictional auth/database adapters', checks: [], runtimeErrors: [], screenshots: [] };
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
  const fixture = expression => driver.evaluate('window.assessmentFixture.' + expression);
  const checkpoint = async name => {
    const { data } = await call('Page.captureScreenshot', { format: 'png' }, sessionId);
    await writeFile(path.join(output, name + '.png'), Buffer.from(data, 'base64'));
    report.screenshots.push(name + '.png');
  };
  const check = (name, actual, expected = true) => { assert.deepEqual(actual, expected, name); report.checks.push(name); };
  await call('Page.navigate', { url }, sessionId);
  await driver.expectText('About you');
  await driver.click({ text: 'Next' });
  await driver.waitFor('required-field feedback', async () => {
    if (report.runtimeErrors.length) throw new Error('Web Next runtime exception: ' + report.runtimeErrors.join('\n'));
    return (await fixture('toasts.at(-1)?.title')) === 'Missing Information';
  });
  check('Missing required name does not write or advance', await fixture('writes.length'), 0);
  check('Missing required field remains on About you', await driver.evaluate('document.querySelector("h2")?.textContent'), 'About you');
  await driver.evaluate(`(() => {
    const label = [...document.querySelectorAll('label')].find(node => node.textContent.trim().startsWith('Name'));
    const input = label?.parentElement.querySelector('input');
    if (!input) throw new Error('Actual Name input was not found');
    input.setAttribute('data-testid', 'web-assessment-name');
  })()`);
  await driver.fill({ id: 'web-assessment-name' }, 'Alex Morgan');
  await fixture('rejectWrites = true');
  await driver.click({ text: 'Next' });
  await driver.waitFor('failed acknowledgment feedback', async () => (await fixture('toasts.at(-1)?.title')) === 'Could not save');
  check('Zero-row acknowledgments exhaust bounded retry', await fixture('writes.length'), 3);
  check('Failed save does not advance', await driver.evaluate('document.querySelector("h2")?.textContent'), 'About you');
  await driver.expectValue({ id: 'web-assessment-name' }, 'Alex Morgan');
  await checkpoint('failed-acknowledgment');
  await fixture('rejectWrites = false');
  const sections = ['Measurements', 'Goals', 'Your routine', 'Training', 'Eating habits', 'Health', 'Daily activity', 'Sleep', 'Wellbeing & digestion'];
  for (const name of sections) {
    await driver.click({ text: 'Next' });
    await driver.waitFor('acknowledged advance to ' + name, async () => (await driver.evaluate('document.querySelector("h2")?.textContent')) === name);
  }
  check('Valid Next advances and records each completed section', JSON.parse(await fixture('row.completed_sections')).length, 9);
  await checkpoint('final-section');
  await driver.click({ text: 'Complete' });
  await driver.expectText('Assessment complete');
  check('Completion callback fires after acknowledged final save', await fixture('completed'), 1);
  check('Final row is completed', await fixture('row.status'), 'completed');
  check('All ten completion IDs survive', JSON.parse(await fixture('row.completed_sections')).length, 10);
  const answers = JSON.parse(await fixture('row.answers'));
  check('Unknown future data survives every web section save', answers.future_answer, { preserved: true });
  check('Historical answers survive every web section save', answers.q60, 'Earlier answer');
  await driver.expectText('Do you have any addiction that you are aware of? (Alcohol, drugs, porn, etc.)');
  await checkpoint('completed-summary');
  const writesBeforeReadback = await fixture('writes.length');
  await fixture(`profile = { full_name: null, phone_number: null, profile_data: { injuries: 'Suggested injury from Profile' } }`);
  await fixture(`row.answers = JSON.stringify({ ...JSON.parse(window.assessmentFixture.row.answers), q14: 'Acknowledged goal after remount' })`);
  await fixture('remount()');
  await driver.expectText('Acknowledged goal after remount');
  await driver.expectAbsent('Suggested injury from Profile');
  check('Completed summary excludes unaccepted Profile suggestions and performs no write', await fixture('writes.length'), writesBeforeReadback);
  await checkpoint('acknowledged-summary');
  await fixture(`role = 'coach'`);
  await fixture(`row.completed_sections = '[]'`);
  await fixture(`row.answers = JSON.stringify({ ...JSON.parse(window.assessmentFixture.row.answers), q14: 'Recorded client goal' })`);
  await fixture('remount()');
  await driver.expectText('Recorded client goal');
  await driver.expectText('Assessment in progress');
  await driver.expectAbsent('Suggested injury from Profile');
  check('Existing read-only client summary also excludes unaccepted suggestions', await fixture('writes.length'), writesBeforeReadback);
  check('No browser runtime exceptions', report.runtimeErrors, []);
  report.status = 'passed';
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.status = 'failed'; report.error = error.stack;
  if (diagnosticDriver) report.lastVisibleText = await diagnosticDriver.text().catch(() => 'Unavailable');
  throw error;
} finally {
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(report, null, 2) + '\n');
  socket?.close(); server.close();
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const exited = new Promise(resolve => chrome.once('exit', resolve));
    chrome.kill('SIGTERM');
    const forceExit = setTimeout(() => chrome.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(forceExit);
  }
  await rm(temp, { recursive: true, force: true, maxRetries: 3 }).catch(() => {});
}
