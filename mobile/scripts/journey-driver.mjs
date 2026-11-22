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
  const find = async (selector, action) => {
    let result;
    try {
      await waitFor(JSON.stringify(selector), async () => {
        result = await evaluate(locate(selector, action));
        return result && !result.error;
      });
    } catch (error) {
      throw new Error(error.message + (result?.error ? ': ' + result.error : ''));
    }
    return result;
  };
  const click = async (selector) => {
    const bounds = await find(selector, `
      el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
      const r = el.getBoundingClientRect();
      if (el.disabled || el.getAttribute('aria-disabled') === 'true') return { error: 'Control is disabled' };
      const x = r.x + r.width / 2, y = r.y + r.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !el.contains(hit)) return { error: 'Control is covered at its center by ' + (hit?.outerHTML.slice(0, 250) || 'the viewport edge') };
      return { x, y };
    `);
    await call('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...bounds }, sessionId);
    await call('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...bounds }, sessionId);
    await delay(150);
  };
  const fill = async (selector, value) => {
    await find(selector, `
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return { error: 'Control is not a text input' };
      el.scrollIntoView({ block: 'center', behavior: 'instant' });
      el.focus(); el.select();
      return { focused: document.activeElement === el };
    `);
    await call('Input.insertText', { text: String(value) }, sessionId);
  };
  const inputValue = (selector) => find(selector, 'return { value: el.value };').then((result) => result.value);
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
  return { click, fill, text, expectText, expectAbsent, expectValue, evaluate, waitFor };
}
