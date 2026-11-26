/** Small CDP driver for exercising the real exported app with fixture data. */
export function createJourneyDriver(call, sessionId, timeoutMs = 20000) {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const locate = (selector, action = 'return el') => `(() => {
    const query = ${JSON.stringify(selector)};
    const candidates = [...document.querySelectorAll(query.css || (query.id ? '[data-testid]' : 'button, [role="button"], [role="radio"], input, textarea'))];
    const visible = node => node.getClientRects().length && !node.closest('[aria-hidden="true"]') && getComputedStyle(node).visibility !== 'hidden';
    const normalized = value => (value || '').replace(/\\s+/g, ' ').trim();
    const matches = candidates.filter(node => visible(node) && (
      query.css ? true : query.id ? node.getAttribute('data-testid') === query.id :
      query.label ? node.getAttribute('aria-label') === query.label :
      normalized(node.innerText || node.textContent) === query.text
    ));
    if (matches.length !== 1) return { error: 'Expected one visible control: ' + JSON.stringify(query) + '; found ' + matches.length };
    const el = matches[0];
    // scrollIntoView also scrolls overflow:hidden ancestors, displacing Gorhom's
    // modal viewport. Scroll only the app's explicit scrolling container.
    const scrollIntoAppView = () => {
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (parent.scrollHeight <= parent.clientHeight || !/auto|scroll/.test(getComputedStyle(parent).overflowY)) continue;
        const target = el.getBoundingClientRect(), bounds = parent.getBoundingClientRect();
        parent.scrollTop += target.top + target.height / 2 - (bounds.top + bounds.height / 2);
        break;
      }
    };
    ${action}
  })()`;
  const waitFor = async (description, predicate) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      if (await predicate()) return;
      await delay(100);
    }
    throw new Error('Timed out waiting for ' + description);
  };
  const find = async (selector, action, ready = () => true) => {
    let result;
    try {
      await waitFor(JSON.stringify(selector), async () => {
        result = await evaluate(locate(selector, action));
        return result && !result.error && ready(result);
      });
    } catch (error) {
      throw new Error(error.message + (result?.error ? ': ' + result.error : ''));
    }
    return result;
  };
  const click = async (selector) => {
    let previousBounds;
    let stableSince = 0;
    const bounds = await find(selector, `
      scrollIntoAppView();
      const r = el.getBoundingClientRect();
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return { error: 'Control is disabled' };
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !el.contains(hit)) {
        const ancestors = [];
        for (let parent = el; parent; parent = parent.parentElement) {
          const box = parent.getBoundingClientRect();
          ancestors.push({ tag: parent.tagName, top: box.top, height: box.height, scrollTop: parent.scrollTop, scrollHeight: parent.scrollHeight, clientHeight: parent.clientHeight, overflowY: getComputedStyle(parent).overflowY });
        }
        return { error: 'Control is covered at its center by ' + (hit?.outerHTML.slice(0, 250) || 'the viewport edge') + '; scroll geometry: ' + JSON.stringify(ancestors) };
      }
      return { x, y };
    `, (current) => {
      // CDP has no automatic layout-stability wait. Let a moving sheet settle
      // before sending pointer events to the measured control coordinates.
      if (!previousBounds || Math.abs(current.x - previousBounds.x) > 0.5 || Math.abs(current.y - previousBounds.y) > 0.5) {
        previousBounds = current;
        stableSince = Date.now();
        return false;
      }
      return Date.now() - stableSince >= 100;
    });
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...bounds }, sessionId);
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...bounds }, sessionId);
    await delay(150);
  };
  const fill = async (selector, value) => {
    await find(selector, `
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return { error: 'Control is not a text input' };
      scrollIntoAppView();
      el.focus({ preventScroll: true }); el.select();
      return { focused: document.activeElement === el };
    `);
    await call('Input.insertText', { text: String(value) }, sessionId);
  };
  const inputValue = (selector) => find(selector, 'return { value: el.value };').then((result) => result.value);
  const pressEnter = async () => {
    await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }, sessionId);
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }, sessionId);
    await delay(100);
  };
  const text = () => evaluate('document.body.innerText');
  const expectText = async (expected) => {
    await waitFor(JSON.stringify(expected), async () => (await text()).includes(expected));
  };
  const expectAbsent = async (unexpected) => {
    if ((await text()).includes(unexpected)) throw new Error('Unexpected visible content: ' + unexpected);
  };
  const expectValue = async (selector, expected) => {
    await waitFor(JSON.stringify(selector) + ' = ' + expected, async () => await inputValue(selector) === String(expected));
  };
  return { click, fill, pressEnter, text, expectText, expectAbsent, expectValue, evaluate, waitFor };
}
