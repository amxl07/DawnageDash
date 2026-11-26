/**
 * Capture the actual Expo web UI with fictional, intercepted Supabase data.
 * Node 22+ and Chrome are required; no app auth bypass or live backend is used.
 * Start Expo with the fixture URL/key shown in docs/redesign/evidence/README.md.
 */
import { execFileSync, spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { exerciseGuidedJourney } from './guided-journeys.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceDirty = Boolean(execFileSync('git', ['status', '--porcelain', '--', 'app', 'src', 'index.js', 'metro.config.js', 'package.json', 'package-lock.json'], { cwd: root, encoding: 'utf8' }).trim());
const fixtures = JSON.parse(await readFile(path.join(root, 'src/testing/redesignFixtures.json'), 'utf8'));
const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf('--' + name);
  return index < 0 ? fallback : args[index + 1];
};
const baseUrl = option('url', 'http://localhost:8088');
const output = path.resolve(root, option('output', 'docs/redesign/evidence/local-web'));
const screenNames = option('screens', 'signin,onboarding,onboarding-rhythm,onboarding-ready,home,checkin,workout').split(',');
const themes = option('themes', 'dark,light').split(',');
const motionPreference = option('motion', 'reduce');
if (!['reduce', 'no-preference'].includes(motionPreference)) throw new Error('Motion must be reduce or no-preference.');
const width = Number(option('width', '390'));
const height = Number(option('height', '844'));
const waitSeconds = Number(option('wait-seconds', '600'));
const startupSeconds = Number(option('startup-seconds', '300'));
const commandSeconds = Number(option('command-seconds', '90'));
if (!Number.isFinite(commandSeconds) || commandSeconds <= 0) throw new Error('Command timeout must be positive.');
const exerciseFlows = args.includes('--exercise-flows');
const existingEndpoint = option('endpoint', '');
if (existingEndpoint && !['localhost', '127.0.0.1'].includes(new URL(existingEndpoint).hostname)) throw new Error('Debugger must be local.');
const chromePath = option('chrome', process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const routes = { 'health-access': '/health-access', signin: '/login', signup: '/login', onboarding: '/onboarding', 'onboarding-rhythm': '/onboarding', 'onboarding-ready': '/onboarding', home: '/', welcome: '/', 'first-checkin': '/check-in?date=2026-09-15', checkin: '/check-in?date=2026-09-15', workout: '/logger?date=2026-09-15&day=1', training: '/plans?view=plan', 'training-history': '/plans?view=history', nutrition: '/nutrition', settings: '/settings', profile: '/profile', measurements: '/measurements', 'measurements-chart': '/measurements', media: '/media', weekly: '/weekly-feedback', you: '/more', hub: '/check-in', gallery: '/' };
const signedOutScreens = new Set(['signin', 'signup', 'health-access']);
const setupMilestones = { onboarding: 0, 'onboarding-rhythm': 1, 'onboarding-ready': 2 };
const readyContent = {
  'health-access': ['Your health data, your choice', 'Dawnage does not write to your health apps.', 'Change or remove access'],
  gallery: ['Dawnage controls', 'Training view', 'Auto-start after a set'],
  settings: ['Settings', 'Reminders'],
  profile: ['Profile', 'Full name'],
  measurements: ['Measurements', 'Waist'],
  'measurements-chart': ['Progress', 'Previous date', 'All values'],
  media: ['Progress photos', 'Add your first set'],
  weekly: ['Weekly check-in'],
  you: ['You', 'Coaching', 'Account'],
  hub: ['Check In', 'Your history'],
  signin: ['Welcome', 'Sign in'],
  signup: ['Create', 'Full name', 'Email'],
  welcome: ['Ready when', 'Start my first check-in'],
  'first-checkin': ['Morning', 'Energy', 'Continue'],
  onboarding: ['1 of 3', 'Fat loss', 'Continue'],
  'onboarding-rhythm': ['2 of 3', 'Check in with your day', 'Continue'],
  'onboarding-ready': ['3 of 3', 'Your timezone', 'Choose how to begin'],
  home: ['Alex', 'Daily check-in', 'This week'],
  checkin: ['Morning', 'Sleep', 'Energy', 'Continue'],
  workout: ['Bench press', 'Complete set', 'Overview'],
  training: ['Training', 'Assigned plan', 'Next session', 'Start Day 1'],
  'training-history': ['Training', 'Workout history', 'Upper body'],
  nutrition: ['Nutrition', 'Nutrition details', 'Breakfast'],
};
if (!screenNames.every((name) => name in routes)) throw new Error('Unknown screen selection.');
if (!['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname)) throw new Error('Capture requires a local Expo server.');
// Cold Metro startup can take minutes; browser error pages are not app evidence.
let serverReady = false;
for (let attempt = 0; attempt < waitSeconds; attempt++) {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(5000) });
    if (response.ok) { serverReady = true; break; }
  } catch { /* Wait for this explicitly selected local server. */ }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!serverReady) throw new Error('The local Expo server did not become ready: ' + baseUrl);
await mkdir(output, { recursive: true });
const profileDir = await mkdtemp(path.join(tmpdir(), 'dawnage-capture-'));
const chrome = existingEndpoint ? null : spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-background-networking', '--disable-component-update', '--disable-sync', '--remote-debugging-port=0',
  '--user-data-dir=' + profileDir, 'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let endpoint;
let startupDiagnostic = '';
try {
  endpoint = existingEndpoint || await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Chrome did not expose its debugger within ' + startupSeconds + ' seconds.')), startupSeconds * 1000);
    chrome.once('error', (error) => { clearTimeout(timer); reject(error); });
    chrome.once('exit', (code) => { clearTimeout(timer); reject(new Error('Chrome exited during startup: ' + code + '\n' + startupDiagnostic)); });
    chrome.stderr.on('data', (chunk) => {
      startupDiagnostic = (startupDiagnostic + String(chunk)).slice(-4000);
      const match = startupDiagnostic.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
  });
} catch (error) {
  chrome?.kill('SIGTERM');
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  throw error;
}
const socket = new WebSocket(endpoint);
await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
let sequence = 0;
const waiting = new Map();
const handlers = new Map();
const call = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = method === 'Page.navigate' ? waitSeconds * 1000 : commandSeconds * 1000;
  const timer = setTimeout(() => { waiting.delete(id); reject(new Error('Timed out: ' + method)); }, timeout);
  waiting.set(id, { resolve, reject, timer });
  socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
socket.addEventListener('message', (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id && waiting.has(message.id)) {
    const pending = waiting.get(message.id);
    waiting.delete(message.id);
    clearTimeout(pending.timer);
    if (message.error) pending.reject(new Error(JSON.stringify(message.error)));
    else pending.resolve(message.result);
  } else if (message.sessionId && handlers.has(message.sessionId)) {
    void handlers.get(message.sessionId)(message).catch((error) => console.error(error.message));
  }
});

const tokenPart = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const user = { id: fixtures.userId, aud: 'authenticated', role: 'authenticated', email: 'alex@example.invalid', email_confirmed_at: '2026-09-01T00:00:00Z', app_metadata: { provider: 'email', providers: ['email'] }, user_metadata: { role: 'client', full_name: 'Alex Morgan' }, created_at: '2026-09-01T00:00:00Z', identities: [] };
const session = { access_token: tokenPart({ alg: 'HS256', typ: 'JWT' }) + '.' + tokenPart({ sub: user.id, exp: 2208988800, role: 'authenticated' }) + '.fictional', token_type: 'bearer', expires_in: 3600, expires_at: 2208988800, refresh_token: 'fictional-refresh-token', user };

function responseFor(request, screen) {
  const url = new URL(request.url);
  const firstVisit = screen === 'welcome' || screen === 'first-checkin';
  if (url.pathname.startsWith('/auth/v1/')) {
    if (screen === 'health-access') return { user: null, session: null };
    return url.pathname.endsWith('/user') ? user : session;
  }
  if (url.pathname.includes('/rpc/get_my_coach')) return firstVisit ? [] : [fixtures.coach];
  const table = url.pathname.split('/').at(-1);
  let rows = [];
  if (table === 'users') rows = [{ ...fixtures.profile, onboarding_step: setupMilestones[screen] ?? 3 }];
  if (table === 'users' && screen === 'nutrition') rows = [{ ...rows[0], active_meal_plan: JSON.stringify({ calories: 2200, dietType: 'Vegetarian' }), nutrition_note: 'Keep meals consistent and adjust portions with your coach.' }];
  if (table === 'meal_plans') rows = [
    { meal_type: 'Breakfast', description: 'Greek yoghurt, oats, seasonal berries and mixed seeds.', calories: 550, protein: 35, carbs: 65, fats: 17 },
    { meal_type: 'Lunch', description: 'Lentils, brown rice and a generous serving of vegetables.', calories: 750, protein: 40, carbs: 100, fats: 21 },
    { meal_type: 'Dinner', description: 'Grilled paneer with wholegrain roti and a fresh salad.', calories: 700, protein: 40, carbs: 75, fats: 26 },
  ].map((meal) => ({ ...meal, user_id: fixtures.userId, day_of_week: 'Daily', calories_target: 2200, diet_type: 'Vegetarian' }));
  if (table === 'daily_check_ins') rows = fixtures.checkIns;
  if (table === 'body_measurements') rows = fixtures.measurements;
  if (table === 'body_measurements' && screen === 'measurements-chart') rows = [
    { ...fixtures.measurements[0], id: 'fixture-measurement-earlier', date: '2026-09-01', chest: 100, waist: 80, hips: 96 },
    { ...fixtures.measurements[0], id: 'fixture-measurement-middle', date: '2026-09-07', chest: 99, waist: 79, hips: null },
    ...fixtures.measurements,
  ];
  if (table === 'workout_logs') rows = fixtures.workoutLogs;
  if (table === 'workout_plans') rows = fixtures.planDays.map((day) => ({ ...day, user_id: fixtures.userId, level: 'Intermediate', workout_type: 'Gym', sub_category: null, days_per_week: 3, exercises: JSON.stringify(day.exercises) }));
  if (table === 'onboarding_questionnaire') rows = [fixtures.assessment];
  if (firstVisit) {
    if (table === 'users') rows = [{ ...fixtures.profile, package_start_date: null, active_workout_plan: null, active_meal_plan: null, profile_data: { ...fixtures.profile.profile_data, start_preference: 'wait_for_coach' }, onboarding_step: 3 }];
    if (['daily_check_ins', 'workout_logs', 'workout_plans', 'body_measurements'].includes(table)) rows = [];
  }
  for (const [key, expression] of url.searchParams) {
    const split = expression.indexOf('.');
    const op = expression.slice(0, split);
    const value = expression.slice(split + 1);
    if (['id', 'user_id', 'date', 'day_number'].includes(key)) {
      if (op === 'eq') rows = rows.filter((row) => String(row[key]) === value);
      if (op === 'lt') rows = rows.filter((row) => String(row[key]) < value);
      if (op === 'lte') rows = rows.filter((row) => String(row[key]) <= value);
      if (op === 'gte') rows = rows.filter((row) => String(row[key]) >= value);
    }
  }
  if (url.searchParams.get('order')?.includes('desc')) rows = [...rows].reverse();
  if (url.searchParams.has('limit')) rows = rows.slice(0, Number(url.searchParams.get('limit')));
  if (request.method !== 'GET' && request.postData) {
    const payload = JSON.parse(request.postData);
    rows = [{ id: rows[0]?.id || 'fictional-saved-row', ...payload }];
  }
  const accept = Object.entries(request.headers).find(([name]) => name.toLowerCase() === 'accept')?.[1] || '';
  return accept.includes('vnd.pgrst.object') ? rows[0] || null : rows;
}

const records = [];
const geometryExpression = `JSON.stringify((() => {
  const rect = el => { const r=el.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height, bottom:r.bottom }; };
  const roots = [...document.querySelectorAll('[data-testid="home-screen"], [data-testid="setup-screen"], [role="tablist"]')].map(el => {
    const chain=[]; for(let node=el; node && chain.length<5; node=node.parentElement) {
      const s=getComputedStyle(node); chain.push({ tag:node.tagName, testId:node.getAttribute('data-testid'), ...rect(node), paddingLeft:s.paddingLeft, paddingRight:s.paddingRight, boxSizing:s.boxSizing });
    } return chain;
  });
  const tabLabels = [...document.querySelectorAll('[role="tablist"] *')].filter(el => !el.children.length && el.textContent.trim()).map(el => ({ text:el.textContent.trim(), ...rect(el) }));
  const controls = ['complete-current-set','sticky-action-bar','workout-rest-footer'].map(id => { const el=document.querySelector('[data-testid="'+id+'"]'); return el ? { id, ...rect(el) } : null; }).filter(Boolean);
  return { viewport: { width:innerWidth, height:innerHeight }, roots, tabLabels, controls };
})())`;
try {
  for (const screen of screenNames) for (const theme of themes) {
    const errors = [];
    const warnings = [];
    const writes = [];
    const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
    handlers.set(sessionId, async (message) => {
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text + ': ' + (message.params.exceptionDetails.exception?.description || ''));
      if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
        const detail = message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ');
        // react-native-svg forwards native `accessible={false}` to its web SVG.
        // React drops the unsupported DOM attribute; retain this known interop
        // warning in evidence, separately from crashes or failed requests.
        if (detail.includes('non-boolean attribute') && detail.includes('false accessible accessible')) warnings.push(detail);
        else errors.push(detail);
      }
      if (message.method === 'Network.responseReceived' && message.params.response.status >= 400 && !message.params.response.url.endsWith('favicon.ico')) errors.push('HTTP ' + message.params.response.status + ': ' + message.params.response.url);
      if (message.method !== 'Fetch.requestPaused') return;
      const { requestId, request } = message.params;
      const requestUrl = new URL(request.url);
      if (['localhost', '127.0.0.1'].includes(requestUrl.hostname)) {
        await call('Fetch.continueRequest', { requestId }, sessionId);
        return;
      }
      if (requestUrl.hostname !== 'preview.invalid') {
        errors.push('Blocked non-fixture request to ' + requestUrl.hostname);
        await call('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' }, sessionId);
        return;
      }
      // This RPC is a read despite POST. Unknown RPCs remain recorded as writes.
      const readsCoach = request.method === 'POST' && requestUrl.pathname === '/rest/v1/rpc/get_my_coach';
      if (!readsCoach && requestUrl.pathname.startsWith('/rest/v1/') && ['POST', 'PATCH', 'PUT'].includes(request.method) && request.postData) {
        writes.push({ table: requestUrl.pathname.split('/').at(-1), method: request.method, payload: JSON.parse(request.postData) });
      }
      const body = request.method === 'OPTIONS' ? '' : JSON.stringify(responseFor(request, screen));
      await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [
        { name: 'content-type', value: 'application/json' },
        { name: 'access-control-allow-origin', value: '*' },
        { name: 'access-control-allow-headers', value: '*' },
        { name: 'access-control-allow-methods', value: 'GET,POST,PATCH,DELETE,OPTIONS' },
        { name: 'content-range', value: '0-9/10' },
      ], body: Buffer.from(body).toString('base64') }, sessionId);
    });
    await call('Runtime.enable', {}, sessionId);
    await call('Network.enable', {}, sessionId);
    await call('Page.enable', {}, sessionId);
    await call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: true }, sessionId);
    await call('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Kolkata' }, sessionId);
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, { name: 'prefers-reduced-motion', value: motionPreference }] }, sessionId);
    await call('Fetch.enable', { patterns: [{ urlPattern: '*' }] }, sessionId);
    const clock = 'const RealDate = Date; globalThis.Date = class extends RealDate { constructor(...args) { if (args.length) super(...args); else super("2026-09-15T04:45:00Z"); } static now() { return RealDate.parse("2026-09-15T04:45:00Z"); } };';
    await call('Page.addScriptToEvaluateOnNewDocument', { source: clock + 'localStorage.clear(); localStorage.setItem("theme-preference", ' + JSON.stringify(theme) + ');' + (signedOutScreens.has(screen) ? '' : 'localStorage.setItem("sb-preview-auth-token", ' + JSON.stringify(JSON.stringify(session)) + ');') }, sessionId);
    await call('Page.navigate', { url: baseUrl + routes[screen] }, sessionId);
    // Close only the already-recorded SVG interop warning in Expo's development
    // toast. Keep it in the manifest; unexpected errors still reject the frame.
    let dismissedDevelopmentWarnings = 0;
    const dismissKnownDevelopmentToast = async () => {
      if (!warnings.length || errors.length) return;
      const result = await call('Runtime.evaluate', { expression: `(() => {
        let count = 0;
        for (const host of document.querySelectorAll('*')) {
          const root = host.shadowRoot;
          if (!root) continue;
          for (const button of root.querySelectorAll('button[class*="dismissButton"]')) {
            const toast = button.closest('[role="button"]');
            if (toast?.textContent.includes('Received') && toast.textContent.includes('non-bool')) {
              button.click(); count += 1;
            }
          }
        }
        return count;
      })()`, returnByValue: true }, sessionId);
      dismissedDevelopmentWarnings += Number(result.result.value) || 0;
      if (result.result.value) await delay(100);
    };
    let content = '';
    for (let attempt = 0; attempt < waitSeconds; attempt++) {
      await delay(1000);
      if (screen === 'measurements-chart') await call('Runtime.evaluate', { expression: `(() => {
        const section = document.querySelector('[data-testid="measurement-progress-section"]');
        if (!section) return;
        for (let parent = section.parentElement; parent; parent = parent.parentElement) {
          if (parent.scrollHeight > parent.clientHeight && /auto|scroll/.test(getComputedStyle(parent).overflowY)) {
            parent.scrollTop += section.getBoundingClientRect().top - parent.getBoundingClientRect().top; break;
          }
        }
      })()` }, sessionId);
      if (screen === 'signup') await call('Runtime.evaluate', { expression: 'document.querySelector(\'[data-testid="login-create-account"]\')?.click()' }, sessionId);
      const result = await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true }, sessionId);
      content = result.result.value || '';
      if (readyContent[screen].every((text) => content.includes(text)) || errors.length) break;
    }
    await delay(2000);
    const settled = await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true }, sessionId);
    content = settled.result.value || '';
    if (!readyContent[screen].every((text) => content.includes(text))) errors.push('The expected populated screen did not become ready; frame rejected.');
    const geometry = await call('Runtime.evaluate', { expression: geometryExpression, returnByValue: true }, sessionId);
    const layout = JSON.parse(geometry.result.value);
    const expectedInset = width < 360 ? 16 : 20;
    if (width < 768 && layout.roots.some(([root]) => root.testId && Math.abs(root.x - expectedInset) > 1)) errors.push('Unexpected horizontal screen inset.');
    if (layout.tabLabels.some((label) => label.bottom > height + 1)) errors.push('A tab label extends below the viewport.');
    const complete = layout.controls.find((control) => control.id === 'complete-current-set');
    const dock = layout.controls.find((control) => control.id === 'workout-rest-footer') || layout.controls.find((control) => control.id === 'sticky-action-bar');
    if (screen === 'workout' && width >= 360 && height >= 800 && complete && dock && complete.bottom > dock.y) errors.push('The initial current-set action is obscured by the dock.');
    if (/This site can.t be reached|ERR_CONNECTION_REFUSED|ERR_EMPTY_RESPONSE/.test(content)) errors.push('Browser connection error; app frame rejected.');
    await dismissKnownDevelopmentToast();
    const file = screen + '-' + theme + '-' + width + '.png';
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
    await writeFile(path.join(output, file), Buffer.from(shot.data, 'base64'));
    await writeFile(path.join(output, file.replace('.png', '.txt')), content + '\n');
    await writeFile(path.join(output, file.replace('.png', '.layout.json')), geometry.result.value + '\n');
    const record = { screen, theme, motionPreference, width, height, file, errors, warnings, dismissedDevelopmentWarnings, renderedTextLength: content.length };
    records.push(record);
    if (exerciseFlows && ['home', 'checkin', 'health-access', 'workout', 'nutrition', 'measurements-chart'].includes(screen) && !errors.length) {
      const checkpoints = [];
      const checkpoint = async (name) => {
        await dismissKnownDevelopmentToast();
        record.dismissedDevelopmentWarnings = dismissedDevelopmentWarnings;
        const frame = screen + '-' + name + '-' + theme + '-' + width;
        if (!['journey-failure', 'measurements', 'required-notes'].includes(name) && screen !== 'measurements-chart') {
          await call('Runtime.evaluate', { expression: `document.querySelectorAll('*').forEach(el => {
            if (el.scrollHeight > el.clientHeight && /auto|scroll/.test(getComputedStyle(el).overflowY)) el.scrollTo({ top: 0, behavior: 'instant' });
          })` }, sessionId);
          await delay(200);
        }
        if (name === 'overview') {
          const measured = await call('Runtime.evaluate', { expression: `(() => {
            const header = document.querySelector('[data-testid="sheet-header"]');
            const body = document.querySelector('[data-testid="workout-overview-scroll"]');
            if (!header || !body) return null;
            const a = header.getBoundingClientRect(), b = body.getBoundingClientRect();
            return { headerTop: a.top, headerBottom: a.bottom, contentTop: b.top };
          })()`, returnByValue: true }, sessionId);
          const bounds = measured.result.value;
          await writeFile(path.join(output, frame + '.layout.json'), JSON.stringify(bounds, null, 2) + '\n');
          if (!bounds || bounds.headerBottom > bounds.contentTop + 1) throw new Error('The Overview sheet header overlaps its scrollable content.');
          if (bounds.headerTop < 0) throw new Error('The Overview sheet header extends above the viewport.');
        }
        if (screen === 'workout' && name === 'history-suggestion' && width >= 360 && height >= 800) {
          const measured = await call('Runtime.evaluate', { expression: geometryExpression, returnByValue: true }, sessionId);
          const bounds = JSON.parse(measured.result.value);
          const completion = bounds.controls.find(control => control.id === 'complete-current-set');
          const footer = bounds.controls.find(control => control.id === 'workout-rest-footer');
          await writeFile(path.join(output, frame + '.layout.json'), measured.result.value + '\n');
          if (completion && footer && completion.bottom > footer.y) throw new Error('The suggested-set completion action is obscured by the dock.');
        }
        const text = await call('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true }, sessionId);
        const snapshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);
        await writeFile(path.join(output, frame + '.png'), Buffer.from(snapshot.data, 'base64'));
        await writeFile(path.join(output, frame + '.txt'), text.result.value + '\n');
        checkpoints.push(frame + '.png');
      };
      try {
        record.journeyChecks = await exerciseGuidedJourney({ screen, call, sessionId, checkpoint, writes });
      } catch (error) {
        errors.push('Guided journey: ' + error.message);
        await checkpoint('journey-failure');
      }
      record.checkpoints = checkpoints;
      record.fixtureWrites = writes;
    }
    await writeFile(path.join(output, 'capture-manifest.json'), JSON.stringify({ platform: 'Expo web / headless Chrome', source: 'fictional intercepted data', sourceRevision, sourceDirty, nativeValidation: false, capturedAt: new Date().toISOString(), baseUrl, records }, null, 2) + '\n');
    console.log('Captured ' + file + (errors.length ? ' (' + errors.length + ' runtime errors)' : ''));
    if (errors.length) console.error(errors.join('\n').slice(0, 5000));
    await call('Target.closeTarget', { targetId });
    handlers.delete(sessionId);
  }
  await writeFile(path.join(output, 'capture-manifest.json'), JSON.stringify({ platform: 'Expo web / headless Chrome', source: 'fictional intercepted data', sourceRevision, sourceDirty, nativeValidation: false, capturedAt: new Date().toISOString(), baseUrl, records }, null, 2) + '\n');
  if (records.some((record) => record.errors.length)) process.exitCode = 1;
} finally {
  socket.close();
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    const exited = new Promise(resolve => chrome.once('exit', resolve));
    chrome.kill('SIGTERM');
    const forceExit = setTimeout(() => chrome.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(forceExit);
  }
  await delay(500);
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}
