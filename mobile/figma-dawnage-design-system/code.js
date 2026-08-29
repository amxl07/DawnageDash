const PAGE_NAMES = ['01 Foundations', '02 Components', '03 Screens & UX'];

const C = {
  dark: {
    background: '#0B0B0C',
    card: '#131416',
    elevated: '#1A1B1E',
    foreground: '#FFFFFF',
    muted: '#A1A1A8',
    primary: '#F04E45',
    primaryFill: '#D93A31',
    onPrimary: '#FFFFFF',
    success: '#00D26A',
    gold: '#F6C85A',
    orange: '#E8853B',
    destructive: '#F04E45',
    border: '#1F1F23',
    borderStrong: '#5E6268',
    focus: '#F04E45',
    chart1: '#F44A3E',
    chart2: '#00D66B',
    chart3: '#FACE57',
    chart4: '#4799EB',
  },
  light: {
    background: '#F2F2F5',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    foreground: '#17171A',
    muted: '#5C5C63',
    primary: '#C0362C',
    primaryFill: '#D93A31',
    onPrimary: '#FFFFFF',
    success: '#0F7A43',
    gold: '#7D5E00',
    orange: '#A85A00',
    destructive: '#C0362C',
    border: '#E4E4E9',
    borderStrong: '#8E8E96',
    focus: '#C0362C',
    chart1: '#E0392E',
    chart2: '#00994D',
    chart3: '#A87C05',
    chart4: '#2E86E0',
  },
};

const S = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48 };
const R = { sm: 8, md: 12, card: 20, pill: 999 };

const TYPE = {
  display: { family: 'Poppins', style: 'Bold', size: 32, lineHeight: 38 },
  metric: { family: 'Poppins', style: 'Bold', size: 28, lineHeight: 34 },
  h1: { family: 'Inter', style: 'Bold', size: 24, lineHeight: 30 },
  h2: { family: 'Inter', style: 'Semi Bold', size: 18, lineHeight: 24 },
  body: { family: 'Inter', style: 'Regular', size: 16, lineHeight: 24 },
  bodySm: { family: 'Inter', style: 'Regular', size: 14, lineHeight: 20 },
  label: { family: 'Inter', style: 'Semi Bold', size: 12, lineHeight: 16, letterSpacing: 0.6 },
};

const loadedFonts = new Set();
let fontFallback = new Map();

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16) / 255,
    g: parseInt(clean.slice(2, 4), 16) / 255,
    b: parseInt(clean.slice(4, 6), 16) / 255,
  };
}

function solid(hex, opacity = 1) {
  return { type: 'SOLID', color: hexToRgb(hex), opacity };
}

function gradient(stops) {
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[0, 1, 0], [-1, 0, 1]],
    gradientStops: stops.map((s) => ({ position: s[0], color: { ...hexToRgb(s[1]), a: s[2] ?? 1 } })),
  };
}

async function loadFont(typeName) {
  const t = TYPE[typeName] || TYPE.body;
  const requested = { family: t.family, style: t.style };
  const key = `${requested.family}/${requested.style}`;
  if (loadedFonts.has(key)) return requested;
  try {
    await figma.loadFontAsync(requested);
    loadedFonts.add(key);
    return requested;
  } catch (_err) {
    const fallback = { family: 'Inter', style: t.style === 'Bold' ? 'Bold' : t.style === 'Semi Bold' ? 'Semi Bold' : 'Regular' };
    const fallbackKey = `${fallback.family}/${fallback.style}`;
    try {
      await figma.loadFontAsync(fallback);
      loadedFonts.add(fallbackKey);
      fontFallback.set(key, fallback);
      return fallback;
    } catch (_err2) {
      const finalFallback = { family: 'Roboto', style: t.style === 'Bold' ? 'Bold' : 'Regular' };
      await figma.loadFontAsync(finalFallback);
      loadedFonts.add(`${finalFallback.family}/${finalFallback.style}`);
      fontFallback.set(key, finalFallback);
      return finalFallback;
    }
  }
}

async function text(content, opts = {}) {
  const node = figma.createText();
  const typeName = opts.type || 'body';
  const t = TYPE[typeName] || TYPE.body;
  node.fontName = await loadFont(typeName);
  node.characters = opts.uppercase ? content.toUpperCase() : content;
  node.fontSize = opts.size || t.size;
  node.lineHeight = { unit: 'PIXELS', value: opts.lineHeight || t.lineHeight };
  if (t.letterSpacing || opts.letterSpacing) {
    node.letterSpacing = { unit: 'PIXELS', value: opts.letterSpacing ?? t.letterSpacing };
  }
  node.fills = [solid(opts.color || C.dark.foreground, opts.opacity ?? 1)];
  if (opts.width) {
    node.resize(opts.width, node.height);
    node.textAutoResize = 'HEIGHT';
  } else {
    node.textAutoResize = 'WIDTH_AND_HEIGHT';
  }
  if (opts.align) node.textAlignHorizontal = opts.align;
  node.name = opts.name || content.slice(0, 48);
  return node;
}

function frame(name, x, y, w, h, fill = null) {
  const node = figma.createFrame();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = fill ? [fill] : [];
  node.clipsContent = false;
  return node;
}

function autoFrame(name, x, y, w, fill = null, direction = 'VERTICAL', gap = S.base, padding = S.base) {
  const node = frame(name, x, y, w, 100, fill);
  node.layoutMode = direction;
  node.counterAxisSizingMode = 'FIXED';
  node.primaryAxisSizingMode = 'AUTO';
  node.itemSpacing = gap;
  node.paddingTop = padding;
  node.paddingRight = padding;
  node.paddingBottom = padding;
  node.paddingLeft = padding;
  return node;
}

function rect(name, x, y, w, h, fill, radius = 0) {
  const node = figma.createRectangle();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = fill ? [fill] : [];
  node.cornerRadius = radius;
  return node;
}

function ellipse(name, x, y, w, h, fill) {
  const node = figma.createEllipse();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = fill ? [fill] : [];
  return node;
}

function stroke(node, hex, width = 1, opacity = 1) {
  node.strokes = [solid(hex, opacity)];
  node.strokeWeight = width;
  return node;
}

function shadow(node, opacity = 0.12, radius = 24, y = 8) {
  node.effects = [{ type: 'DROP_SHADOW', color: { r: 0, g: 0, b: 0, a: opacity }, offset: { x: 0, y }, radius, spread: 0, visible: true, blendMode: 'NORMAL' }];
  return node;
}

async function label(parent, copy, x, y, color = C.dark.muted) {
  const n = await text(copy, { type: 'label', color, uppercase: true });
  n.x = x;
  n.y = y;
  parent.appendChild(n);
  return n;
}

async function addTitle(page, title, subtitle) {
  const cover = frame('Title', 48, 48, 1320, 220, gradient([[0, C.dark.primary, 0.28], [0.48, C.dark.background, 1], [1, C.dark.card, 1]]));
  cover.cornerRadius = 32;
  page.appendChild(cover);
  const mark = await logoLockup(72, 64, 'dark');
  cover.appendChild(mark);
  const h = await text(title, { type: 'display', color: C.dark.foreground });
  h.x = 72;
  h.y = 128;
  cover.appendChild(h);
  const p = await text(subtitle, { type: 'bodySm', color: C.dark.muted, width: 960 });
  p.x = 72;
  p.y = 172;
  cover.appendChild(p);
}

async function logoLockup(x, y, theme = 'dark') {
  const colors = C[theme];
  const g = frame('Dawnage lockup', x, y, 230, 42, null);
  const bird = frame('Forward bird glyph', 0, 2, 44, 32, null);
  const wing = figma.createPolygon();
  wing.name = 'Wing';
  wing.pointCount = 3;
  wing.resize(34, 22);
  wing.x = 6;
  wing.y = 2;
  wing.rotation = -8;
  wing.fills = [solid(colors.primary)];
  wing.cornerRadius = 2;
  bird.appendChild(wing);
  const body = ellipse('Body', 10, 13, 28, 12, solid(colors.foreground));
  body.rotation = -12;
  bird.appendChild(body);
  const word = await text('Dawnage', { type: 'h1', color: colors.foreground });
  word.x = 52;
  word.y = 4;
  g.appendChild(bird);
  g.appendChild(word);
  return g;
}

async function chip(copy, theme = 'dark', selected = false, icon = false) {
  const colors = C[theme];
  const n = autoFrame(`Chip / ${copy}`, 0, 0, 10, selected ? solid(colors.primary, 0.12) : solid(colors.elevated), 'HORIZONTAL', S.xs, 0);
  n.counterAxisAlignItems = 'CENTER';
  n.primaryAxisAlignItems = 'CENTER';
  n.paddingTop = 8;
  n.paddingRight = 12;
  n.paddingBottom = 8;
  n.paddingLeft = 12;
  n.cornerRadius = R.pill;
  stroke(n, selected ? colors.primary : colors.borderStrong, 1);
  if (icon) n.appendChild(ellipse('Icon dot', 0, 0, 10, 10, solid(selected ? colors.primary : colors.muted)));
  n.appendChild(await text(copy, { type: 'bodySm', color: selected ? colors.primary : colors.muted }));
  return n;
}

async function badge(copy, tone = 'neutral', theme = 'dark') {
  const colors = C[theme];
  const toneMap = {
    neutral: [colors.elevated, colors.muted],
    success: [colors.success, colors.success],
    gold: [colors.gold, colors.gold],
    primary: [colors.primary, colors.primary],
  };
  const [base, fg] = toneMap[tone];
  const n = autoFrame(`Badge / ${tone}`, 0, 0, 10, solid(base, tone === 'neutral' ? 1 : 0.14), 'HORIZONTAL', 0, 0);
  n.counterAxisAlignItems = 'CENTER';
  n.primaryAxisAlignItems = 'CENTER';
  n.paddingTop = 3;
  n.paddingRight = 8;
  n.paddingBottom = 3;
  n.paddingLeft = 8;
  n.cornerRadius = R.pill;
  n.appendChild(await text(copy, { type: 'label', color: fg, uppercase: true }));
  return n;
}

async function button(copy, variant = 'primary', theme = 'dark', state = 'default', icon = false) {
  const colors = C[theme];
  const n = autoFrame(`Button / ${variant} / ${state}`, 0, 0, 210, null, 'HORIZONTAL', S.sm, 0);
  n.resize(210, 48);
  n.layoutSizingHorizontal = 'FIXED';
  n.primaryAxisSizingMode = 'FIXED';
  n.counterAxisSizingMode = 'FIXED';
  n.primaryAxisAlignItems = 'CENTER';
  n.counterAxisAlignItems = 'CENTER';
  n.cornerRadius = 14;
  n.fills = variant === 'primary' ? [solid(colors.primaryFill)] : [];
  if (variant === 'secondary') stroke(n, colors.borderStrong, 1);
  if (state === 'disabled' || state === 'loading') n.opacity = 0.45;
  if (state === 'loading') {
    const ring = ellipse('Spinner', 0, 0, 18, 18, null);
    ring.strokes = [solid(variant === 'primary' ? colors.onPrimary : colors.primary)];
    ring.strokeWeight = 2;
    n.appendChild(ring);
    return n;
  }
  if (icon) {
    const dot = ellipse('Icon', 0, 0, 16, 16, solid(variant === 'primary' ? colors.onPrimary : colors.primary));
    n.appendChild(dot);
  }
  n.appendChild(await text(copy, { type: 'h2', color: variant === 'primary' ? colors.onPrimary : colors.primary }));
  return n;
}

async function input(copy = 'Email', value = 'name@example.com', state = 'default', theme = 'dark', icon = true, password = false) {
  const colors = C[theme];
  const wrap = autoFrame(`Input / ${copy} / ${state}`, 0, 0, 320, null, 'VERTICAL', S.xs, 0);
  wrap.appendChild(await text(copy, { type: 'label', color: colors.muted, uppercase: true }));
  const row = autoFrame('Field', 0, 0, 320, solid(colors.elevated), 'HORIZONTAL', S.sm, 0);
  row.resize(320, 48);
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'FIXED';
  row.counterAxisAlignItems = 'CENTER';
  row.paddingLeft = S.md;
  row.paddingRight = S.md;
  row.cornerRadius = R.md;
  const borderColor = state === 'error' ? colors.destructive : state === 'focused' ? colors.focus : colors.borderStrong;
  stroke(row, borderColor, state === 'focused' ? 2 : 1);
  if (state === 'disabled') row.opacity = 0.45;
  if (icon) row.appendChild(ellipse('Leading icon', 0, 0, 18, 18, solid(colors.muted)));
  const val = await text(value, { type: 'body', color: state === 'disabled' ? colors.muted : colors.foreground });
  val.layoutGrow = 1;
  row.appendChild(val);
  if (password) row.appendChild(await text('eye', { type: 'bodySm', color: colors.muted }));
  wrap.appendChild(row);
  if (state === 'error') wrap.appendChild(await text('Please enter a valid value.', { type: 'bodySm', color: colors.destructive }));
  else wrap.appendChild(await text('Helper text explains the field.', { type: 'bodySm', color: colors.muted }));
  return wrap;
}

async function cardMock(theme = 'dark', elevated = false) {
  const colors = C[theme];
  const n = autoFrame(`Card / ${elevated ? 'Elevated' : 'Default'} / ${theme}`, 0, 0, 300, solid(elevated ? colors.elevated : colors.card), 'VERTICAL', S.md, S.base);
  n.cornerRadius = R.card;
  stroke(n, colors.border, 1);
  if (theme === 'light') shadow(n, elevated ? 0.12 : 0.06, elevated ? 24 : 12, elevated ? 8 : 2);
  n.appendChild(await text('Card title', { type: 'h2', color: colors.foreground }));
  n.appendChild(await text('Reusable surface for metrics, charts, summaries and grouped form content.', { type: 'bodySm', color: colors.muted, width: 240 }));
  return n;
}

async function progressBar(value = 0.65, tone = 'primary', theme = 'dark') {
  const colors = C[theme];
  const fill = tone === 'success' ? colors.success : tone === 'gold' ? colors.gold : colors.primary;
  const wrap = frame(`ProgressBar / ${Math.round(value * 100)} / ${tone}`, 0, 0, 260, 8, solid(colors.elevated));
  wrap.cornerRadius = R.pill;
  if (theme === 'light') stroke(wrap, colors.border, 1);
  const bar = rect('Fill', 0, 0, 260 * value, 8, solid(fill), R.pill);
  bar.effects = [{ type: 'DROP_SHADOW', color: { ...hexToRgb(fill), a: theme === 'dark' ? 0.55 : 0.15 }, offset: { x: 0, y: 0 }, radius: 8, spread: 0, visible: true, blendMode: 'NORMAL' }];
  wrap.appendChild(bar);
  return wrap;
}

async function optionRow(copy, selected = false, theme = 'dark') {
  const colors = C[theme];
  const n = autoFrame(`OptionRow / ${selected ? 'Selected' : 'Default'}`, 0, 0, 320, selected ? solid(colors.primary, 0.05) : null, 'HORIZONTAL', S.md, 0);
  n.resize(320, 48);
  n.primaryAxisSizingMode = 'FIXED';
  n.counterAxisSizingMode = 'FIXED';
  n.counterAxisAlignItems = 'CENTER';
  n.paddingLeft = S.base;
  n.paddingRight = S.base;
  n.cornerRadius = R.md;
  stroke(n, selected ? colors.primary : colors.borderStrong, selected ? 2 : 1);
  const tx = await text(copy, { type: 'body', color: selected ? colors.primary : colors.foreground });
  tx.layoutGrow = 1;
  n.appendChild(tx);
  n.appendChild(await text(selected ? 'check' : '', { type: 'bodySm', color: colors.primary }));
  return n;
}

async function segmented(theme = 'dark', large = false) {
  const colors = C[theme];
  const wrap = autoFrame(`SegmentedControl / ${large ? 'Large' : 'Compact'}`, 0, 0, 340, null, 'VERTICAL', S.xs, 0);
  wrap.appendChild(await text(large ? 'Workout status' : 'Plan type', { type: 'label', color: colors.muted, uppercase: true }));
  const row = autoFrame('Segments', 0, 0, 340, null, 'HORIZONTAL', S.sm, 0);
  row.layoutWrap = large ? 'WRAP' : 'NO_WRAP';
  const items = large ? ['Done', 'No', 'Cardio', 'Rest'] : ['Training', 'Nutrition', 'Notes'];
  for (let i = 0; i < items.length; i += 1) {
    const active = i === 0;
    const cell = autoFrame(items[i], 0, 0, large ? 160 : 104, active ? solid(colors.primaryFill) : null, large ? 'VERTICAL' : 'HORIZONTAL', S.xs, 0);
    cell.resize(large ? 160 : 104, large ? 64 : 44);
    cell.primaryAxisSizingMode = 'FIXED';
    cell.counterAxisSizingMode = 'FIXED';
    cell.primaryAxisAlignItems = 'CENTER';
    cell.counterAxisAlignItems = 'CENTER';
    cell.cornerRadius = R.md;
    stroke(cell, active ? colors.primary : colors.borderStrong, active ? 2 : 1);
    if (large) cell.appendChild(ellipse('Icon', 0, 0, 18, 18, solid(active ? colors.onPrimary : colors.muted)));
    cell.appendChild(await text(items[i], { type: 'bodySm', color: active ? colors.onPrimary : colors.foreground }));
    row.appendChild(cell);
  }
  wrap.appendChild(row);
  return wrap;
}

async function ratingRow(theme = 'dark') {
  const colors = C[theme];
  const row = autoFrame('RatingRow / 1-10', 0, 0, 322, null, 'HORIZONTAL', S.sm, 0);
  row.layoutWrap = 'WRAP';
  for (let i = 1; i <= 10; i += 1) {
    const active = i === 8;
    const cell = autoFrame(String(i), 0, 0, 44, active ? solid(colors.primaryFill) : null, 'HORIZONTAL', 0, 0);
    cell.resize(44, 44);
    cell.primaryAxisSizingMode = 'FIXED';
    cell.counterAxisSizingMode = 'FIXED';
    cell.primaryAxisAlignItems = 'CENTER';
    cell.counterAxisAlignItems = 'CENTER';
    cell.cornerRadius = R.md;
    stroke(cell, active ? colors.primary : colors.borderStrong, active ? 2 : 1);
    cell.appendChild(await text(String(i), { type: 'body', color: active ? colors.onPrimary : colors.foreground }));
    row.appendChild(cell);
  }
  return row;
}

async function stepper(theme = 'dark') {
  const colors = C[theme];
  const wrap = autoFrame('Stepper / Numeric input', 0, 0, 320, null, 'VERTICAL', S.xs, 0);
  wrap.appendChild(await text('Morning weight', { type: 'label', color: colors.muted, uppercase: true }));
  const row = autoFrame('Stepper row', 0, 0, 320, solid(colors.elevated), 'HORIZONTAL', 0, 0);
  row.resize(320, 48);
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'FIXED';
  row.counterAxisAlignItems = 'CENTER';
  row.cornerRadius = R.md;
  stroke(row, colors.borderStrong, 1);
  const minus = autoFrame('Minus', 0, 0, 48, null, 'HORIZONTAL', 0, 0);
  minus.resize(48, 48);
  minus.primaryAxisSizingMode = 'FIXED';
  minus.counterAxisSizingMode = 'FIXED';
  minus.primaryAxisAlignItems = 'CENTER';
  minus.counterAxisAlignItems = 'CENTER';
  minus.appendChild(await text('-', { type: 'h2', color: colors.foreground }));
  const value = await text('82.4 kg', { type: 'h2', color: colors.foreground, align: 'CENTER' });
  value.layoutGrow = 1;
  const plus = autoFrame('Plus', 0, 0, 48, null, 'HORIZONTAL', 0, 0);
  plus.resize(48, 48);
  plus.primaryAxisSizingMode = 'FIXED';
  plus.counterAxisSizingMode = 'FIXED';
  plus.primaryAxisAlignItems = 'CENTER';
  plus.counterAxisAlignItems = 'CENTER';
  plus.appendChild(await text('+', { type: 'h2', color: colors.foreground }));
  row.appendChild(minus);
  row.appendChild(value);
  row.appendChild(plus);
  wrap.appendChild(row);
  wrap.appendChild(await text('last: 82.6 kg · hold the number to type', { type: 'bodySm', color: colors.muted }));
  return wrap;
}

async function metricCard(labelCopy, valueCopy, unit, tone, theme = 'dark') {
  const colors = C[theme];
  const toneColor = tone === 'success' ? colors.success : tone === 'gold' ? colors.gold : tone === 'blue' ? colors.chart4 : colors.primary;
  const card = autoFrame(`MetricCard / ${labelCopy}`, 0, 0, 168, solid(colors.card), 'VERTICAL', S.sm, S.base);
  card.cornerRadius = R.card;
  stroke(card, colors.border, 1);
  if (theme === 'light') shadow(card, 0.06, 12, 2);
  const top = autoFrame('Top row', 0, 0, 136, null, 'HORIZONTAL', S.sm, 0);
  top.counterAxisAlignItems = 'CENTER';
  top.appendChild(ellipse('Icon', 0, 0, 20, 20, solid(toneColor, 0.22)));
  top.appendChild(await text(labelCopy, { type: 'label', color: colors.muted, uppercase: true }));
  card.appendChild(top);
  const value = await text(valueCopy, { type: 'metric', color: colors.foreground });
  card.appendChild(value);
  card.appendChild(await text(unit, { type: 'bodySm', color: colors.muted }));
  return card;
}

async function emptyState(theme = 'dark') {
  const colors = C[theme];
  const n = autoFrame('EmptyState', 0, 0, 320, solid(colors.card), 'VERTICAL', S.md, S.xl);
  n.counterAxisAlignItems = 'CENTER';
  n.cornerRadius = R.card;
  stroke(n, colors.border, 1);
  n.appendChild(ellipse('Dawnage glyph', 0, 0, 32, 32, solid(colors.borderStrong)));
  n.appendChild(await text('Your first check-in starts everything', { type: 'h2', color: colors.foreground, align: 'CENTER', width: 250 }));
  n.appendChild(await text('Charts, streaks, and coach reports appear after your first entry.', { type: 'bodySm', color: colors.muted, align: 'CENTER', width: 250 }));
  n.appendChild(await button('Do my first check-in', 'primary', theme));
  return n;
}

async function errorState(theme = 'dark') {
  const colors = C[theme];
  const n = autoFrame('ErrorState', 0, 0, 320, solid(colors.card), 'VERTICAL', S.md, S.xl);
  n.counterAxisAlignItems = 'CENTER';
  n.cornerRadius = R.card;
  stroke(n, colors.border, 1);
  n.appendChild(ellipse('Alert icon', 0, 0, 32, 32, solid(colors.destructive, 0.18)));
  n.appendChild(await text("Couldn't load your dashboard", { type: 'h2', color: colors.foreground, align: 'CENTER', width: 250 }));
  n.appendChild(await text('Check your connection and try again.', { type: 'bodySm', color: colors.muted, align: 'CENTER', width: 250 }));
  n.appendChild(await button('Retry', 'secondary', theme));
  return n;
}

async function phoneFrame(name, x, y, theme = 'dark') {
  const colors = C[theme];
  const phone = frame(name, x, y, 390, 844, solid(colors.background));
  phone.cornerRadius = 36;
  phone.clipsContent = true;
  stroke(phone, theme === 'dark' ? '#2A2B30' : '#D8D8DE', 1);
  shadow(phone, theme === 'dark' ? 0.24 : 0.12, 32, 16);
  const status = await text('9:41', { type: 'bodySm', color: colors.foreground });
  status.x = 32;
  status.y = 18;
  phone.appendChild(status);
  const home = rect('Home indicator', 136, 824, 118, 4, solid(colors.foreground, theme === 'dark' ? 0.5 : 0.25), R.pill);
  phone.appendChild(home);
  return phone;
}

async function dawnGlow(parent, theme = 'dark') {
  const colors = C[theme];
  const glow = rect('DawnGlow', 0, 0, 390, 230, gradient([[0, colors.primary, theme === 'dark' ? 0.42 : 0.18], [0.45, colors.gold, theme === 'dark' ? 0.14 : 0.08], [1, colors.background, 0]]), 0);
  parent.appendChild(glow);
  return glow;
}

async function screenAuth(x, y, theme = 'dark') {
  const colors = C[theme];
  const p = await phoneFrame('Screen / Auth / Sign in', x, y, theme);
  await dawnGlow(p, theme);
  const logo = await logoLockup(96, 88, theme);
  p.appendChild(logo);
  const h = await text('Welcome back', { type: 'h1', color: colors.foreground, align: 'CENTER', width: 320 });
  h.x = 35;
  h.y = 218;
  p.appendChild(h);
  const sub = await text('Enter your credentials to access your account', { type: 'bodySm', color: colors.muted, align: 'CENTER', width: 320 });
  sub.x = 35;
  sub.y = 252;
  p.appendChild(sub);
  const c = autoFrame('Auth card', 24, 300, 342, solid(colors.card), 'VERTICAL', S.base, S.base);
  c.cornerRadius = R.card;
  stroke(c, colors.border, 1);
  if (theme === 'light') shadow(c, 0.06, 12, 2);
  c.appendChild(await input('Email', 'name@example.com', 'default', theme, true));
  c.appendChild(await input('Password', '••••••••', 'default', theme, true, true));
  c.appendChild(await button('Sign in', 'primary', theme));
  c.appendChild(await button('Create account', 'ghost', theme));
  p.appendChild(c);
  return p;
}

async function screenDashboard(x, y, theme = 'dark', empty = false) {
  const colors = C[theme];
  const p = await phoneFrame(empty ? 'Screen / Dashboard / Empty' : 'Screen / Dashboard / Active', x, y, theme);
  await dawnGlow(p, theme);
  const greeting = await text('Good morning, Amal', { type: 'h1', color: colors.foreground });
  greeting.x = 24;
  greeting.y = 78;
  p.appendChild(greeting);
  const sub = await text(empty ? 'Your check-in is waiting.' : "Today's logged.", { type: 'bodySm', color: colors.muted });
  sub.x = 24;
  sub.y = 112;
  p.appendChild(sub);
  if (empty) {
    const e = await emptyState(theme);
    e.x = 35;
    e.y = 180;
    p.appendChild(e);
  } else {
    const hero = autoFrame('Streak hero', 24, 156, 342, solid(colors.card), 'HORIZONTAL', S.base, S.base);
    hero.cornerRadius = R.card;
    stroke(hero, colors.border, 1);
    if (theme === 'light') shadow(hero, 0.06, 12, 2);
    const left = autoFrame('Streak text', 0, 0, 150, null, 'VERTICAL', 2, 0);
    left.appendChild(await text('12', { type: 'display', size: 44, lineHeight: 48, color: colors.foreground }));
    left.appendChild(await text('day streak', { type: 'bodySm', color: colors.muted }));
    hero.appendChild(left);
    const right = autoFrame('Streak meta', 0, 0, 150, null, 'VERTICAL', S.sm, 0);
    right.appendChild(await text('Day 271 · Week 39', { type: 'bodySm', color: colors.muted }));
    right.appendChild(await button('Check in', 'secondary', theme));
    hero.appendChild(right);
    p.appendChild(hero);

    const week = autoFrame('Week strip', 24, 282, 342, null, 'HORIZONTAL', S.sm, 0);
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    for (let i = 0; i < days.length; i += 1) {
      const active = i < 5;
      const d = autoFrame(days[i], 0, 0, 42, active ? solid(colors.primaryFill) : solid(colors.elevated), 'VERTICAL', 2, 0);
      d.resize(42, 54);
      d.primaryAxisSizingMode = 'FIXED';
      d.counterAxisSizingMode = 'FIXED';
      d.primaryAxisAlignItems = 'CENTER';
      d.counterAxisAlignItems = 'CENTER';
      d.cornerRadius = R.md;
      d.appendChild(await text(days[i], { type: 'label', color: active ? colors.onPrimary : colors.muted, uppercase: true }));
      d.appendChild(await text(String(21 + i), { type: 'bodySm', color: active ? colors.onPrimary : colors.foreground }));
      week.appendChild(d);
    }
    p.appendChild(week);

    const m1 = await metricCard('Weight', '82.4', 'kg · -0.8 last 7 days', 'primary', theme);
    m1.x = 24;
    m1.y = 360;
    p.appendChild(m1);
    const m2 = await metricCard('Nutrition', '8', '/10 average', 'success', theme);
    m2.x = 198;
    m2.y = 360;
    p.appendChild(m2);
    const chart = autoFrame('Weight trend chart card', 24, 530, 342, solid(colors.card), 'VERTICAL', S.md, S.base);
    chart.cornerRadius = R.card;
    stroke(chart, colors.border, 1);
    chart.appendChild(await text('Weight trend', { type: 'h2', color: colors.foreground }));
    const plot = frame('Line chart', 0, 0, 310, 130, null);
    const base = rect('Chart grid', 0, 16, 310, 1, solid(colors.border), 0);
    plot.appendChild(base);
    for (let i = 1; i <= 4; i += 1) plot.appendChild(rect('Gridline', 0, 16 + i * 24, 310, 1, solid(colors.border), 0));
    const points = [[8, 92], [58, 84], [108, 88], [158, 70], [208, 68], [258, 55], [302, 46]];
    for (let i = 0; i < points.length - 1; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[i + 1];
      const line = figma.createLine();
      line.x = x1;
      line.y = y1;
      line.resize(Math.hypot(x2 - x1, y2 - y1), 0);
      line.rotation = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
      line.strokes = [solid(colors.chart1)];
      line.strokeWeight = 3;
      plot.appendChild(line);
    }
    chart.appendChild(plot);
    p.appendChild(chart);
  }
  return p;
}

async function screenCheckIn(x, y, theme = 'dark') {
  const colors = C[theme];
  const p = await phoneFrame('Screen / Check-in / Fast form', x, y, theme);
  const h = await text('How was today?', { type: 'h1', color: colors.foreground });
  h.x = 24;
  h.y = 78;
  p.appendChild(h);
  const sub = await text('🔥 12-day streak — keep it going.', { type: 'bodySm', color: colors.muted });
  sub.x = 24;
  sub.y = 112;
  p.appendChild(sub);
  const same = await chip('Same as yesterday', theme, true, true);
  same.x = 24;
  same.y = 148;
  p.appendChild(same);
  const form = autoFrame('Check-in form card', 24, 202, 342, solid(colors.card), 'VERTICAL', S.lg, S.base);
  form.cornerRadius = R.card;
  stroke(form, colors.border, 1);
  form.appendChild(await stepper(theme));
  form.appendChild(await segmented(theme, true));
  form.appendChild(await text('Nutrition score', { type: 'label', color: colors.muted, uppercase: true }));
  form.appendChild(await ratingRow(theme));
  p.appendChild(form);
  const bar = frame('Sticky action bar', 0, 740, 390, 86, solid(colors.card));
  stroke(bar, colors.border, 1);
  const done = await button('Submit · keeps your 12-day streak', 'primary', theme);
  done.x = 24;
  done.y = 16;
  done.resize(342, 48);
  bar.appendChild(done);
  p.appendChild(bar);
  return p;
}

async function screenQuestionnaire(x, y, theme = 'dark') {
  const colors = C[theme];
  const p = await phoneFrame('Screen / Questionnaire', x, y, theme);
  const lab = await text('Section 2 of 8', { type: 'label', color: colors.muted, uppercase: true });
  lab.x = 24;
  lab.y = 78;
  p.appendChild(lab);
  const pb = await progressBar(0.25, 'primary', theme);
  pb.x = 24;
  pb.y = 106;
  pb.resize(342, 8);
  p.appendChild(pb);
  const h = await text('Nutrition habits', { type: 'h1', color: colors.foreground });
  h.x = 24;
  h.y = 142;
  p.appendChild(h);
  const sub = await text('Tell us how your usual week looks so your coach can personalise the plan.', { type: 'bodySm', color: colors.muted, width: 342 });
  sub.x = 24;
  sub.y = 176;
  p.appendChild(sub);
  const card = autoFrame('Question card', 24, 232, 342, solid(colors.card), 'VERTICAL', S.lg, S.base);
  card.cornerRadius = R.card;
  stroke(card, colors.border, 1);
  card.appendChild(await input('Daily protein target', '120g', 'focused', theme, false));
  card.appendChild(await text('How consistent are meals?', { type: 'label', color: colors.muted, uppercase: true }));
  card.appendChild(await optionRow('Mostly consistent', true, theme));
  card.appendChild(await optionRow('Weekdays only', false, theme));
  card.appendChild(await optionRow('Irregular', false, theme));
  p.appendChild(card);
  const actions = autoFrame('Actions', 24, 704, 342, null, 'HORIZONTAL', S.sm, 0);
  actions.appendChild(await button('Back', 'secondary', theme));
  const next = await button('Save & continue', 'primary', theme);
  next.resize(220, 48);
  actions.appendChild(next);
  p.appendChild(actions);
  return p;
}

async function screenSettings(x, y, theme = 'dark') {
  const colors = C[theme];
  const p = await phoneFrame('Screen / Settings / Appearance', x, y, theme);
  const h = await text('Settings', { type: 'h1', color: colors.foreground });
  h.x = 24;
  h.y = 78;
  p.appendChild(h);
  const card = autoFrame('Appearance card', 24, 132, 342, solid(colors.card), 'VERTICAL', S.base, S.base);
  card.cornerRadius = R.card;
  stroke(card, colors.border, 1);
  card.appendChild(await text('Appearance', { type: 'h2', color: colors.foreground }));
  card.appendChild(await optionRow('System', true, theme));
  card.appendChild(await optionRow('Light', false, theme));
  card.appendChild(await optionRow('Dark', false, theme));
  p.appendChild(card);
  const reminders = autoFrame('Reminders card', 24, 408, 342, solid(colors.card), 'VERTICAL', S.md, S.base);
  reminders.cornerRadius = R.card;
  stroke(reminders, colors.border, 1);
  reminders.appendChild(await text('Reminders', { type: 'h2', color: colors.foreground }));
  reminders.appendChild(await text('Daily check-in reminder', { type: 'body', color: colors.foreground }));
  reminders.appendChild(await chip('07:30 AM', theme, true, false));
  p.appendChild(reminders);
  return p;
}

async function buildFoundations(page) {
  figma.currentPage = page;
  await addTitle(page, 'Dawnage Mobile Design System', 'A 3-page high-fidelity Figma system generated from the shipped Expo app: foundations, reusable components, and screen UX patterns.');

  const brand = autoFrame('Brand Direction', 48, 316, 420, solid(C.dark.card), 'VERTICAL', S.md, S.lg);
  brand.cornerRadius = R.card;
  stroke(brand, C.dark.border, 1);
  brand.appendChild(await text('First light, disciplined data', { type: 'h2', color: C.dark.foreground }));
  brand.appendChild(await text('Dawnage uses a directional dawn wash on auth and dashboard only. The rest of the product stays quiet so habit data, coaching feedback, and daily action remain the focus.', { type: 'bodySm', color: C.dark.muted, width: 348 }));
  brand.appendChild(await logoLockup(0, 0, 'dark'));
  page.appendChild(brand);

  const colorSection = autoFrame('Color Styles', 516, 316, 852, solid(C.dark.card), 'VERTICAL', S.lg, S.lg);
  colorSection.cornerRadius = R.card;
  stroke(colorSection, C.dark.border, 1);
  colorSection.appendChild(await text('Color Styles', { type: 'h2', color: C.dark.foreground }));
  const colorRows = autoFrame('Color rows', 0, 0, 800, null, 'HORIZONTAL', S.xl, 0);
  for (const theme of ['dark', 'light']) {
    const col = autoFrame(`${theme} palette`, 0, 0, 372, null, 'VERTICAL', S.sm, 0);
    col.appendChild(await text(`${theme} theme`, { type: 'label', color: theme === 'dark' ? C.dark.muted : C.dark.foreground, uppercase: true }));
    const tokens = ['background', 'card', 'elevated', 'foreground', 'muted', 'primary', 'primaryFill', 'success', 'gold', 'borderStrong', 'chart1', 'chart2', 'chart3', 'chart4'];
    for (const token of tokens) {
      const row = autoFrame(token, 0, 0, 360, null, 'HORIZONTAL', S.sm, 0);
      row.counterAxisAlignItems = 'CENTER';
      row.appendChild(rect(token, 0, 0, 32, 32, solid(C[theme][token]), 8));
      row.appendChild(await text(`${token}  ${C[theme][token]}`, { type: 'bodySm', color: C.dark.foreground }));
      col.appendChild(row);
    }
    colorRows.appendChild(col);
  }
  colorSection.appendChild(colorRows);
  page.appendChild(colorSection);

  const typography = autoFrame('Typography Styles', 48, 620, 640, solid(C.light.card), 'VERTICAL', S.md, S.lg);
  typography.cornerRadius = R.card;
  stroke(typography, C.light.border, 1);
  shadow(typography, 0.06, 12, 2);
  typography.appendChild(await text('Typography', { type: 'h2', color: C.light.foreground }));
  const samples = [
    ['Display', '32/38 Poppins Bold', 'display'],
    ['Metric', '28/34 Poppins Bold', 'metric'],
    ['H1', '24/30 Inter Bold', 'h1'],
    ['H2', '18/24 Inter SemiBold', 'h2'],
    ['Body', '16/24 Inter Regular', 'body'],
    ['Body Small', '14/20 Inter Regular', 'bodySm'],
    ['LABEL', '12/16 Inter SemiBold uppercase', 'label'],
  ];
  for (const [name, meta, typeName] of samples) {
    const row = autoFrame(name, 0, 0, 580, null, 'HORIZONTAL', S.lg, 0);
    row.counterAxisAlignItems = 'CENTER';
    const sample = await text(name, { type: typeName, color: C.light.foreground, uppercase: typeName === 'label' });
    sample.layoutGrow = 1;
    row.appendChild(sample);
    row.appendChild(await text(meta, { type: 'bodySm', color: C.light.muted }));
    typography.appendChild(row);
  }
  page.appendChild(typography);

  const scales = autoFrame('Spacing Radius Motion Accessibility', 736, 620, 632, solid(C.light.card), 'VERTICAL', S.lg, S.lg);
  scales.cornerRadius = R.card;
  stroke(scales, C.light.border, 1);
  shadow(scales, 0.06, 12, 2);
  scales.appendChild(await text('Spacing, Radius, Motion, Accessibility', { type: 'h2', color: C.light.foreground }));
  const spacingRow = autoFrame('Spacing scale', 0, 0, 560, null, 'HORIZONTAL', S.md, 0);
  for (const [name, value] of Object.entries(S)) {
    const item = autoFrame(name, 0, 0, 70, null, 'VERTICAL', S.xs, 0);
    item.counterAxisAlignItems = 'CENTER';
    item.appendChild(rect(`${name} ${value}`, 0, 0, value, 32, solid(C.light.primaryFill), 4));
    item.appendChild(await text(`${name}\n${value}`, { type: 'bodySm', color: C.light.muted, align: 'CENTER' }));
    spacingRow.appendChild(item);
  }
  scales.appendChild(spacingRow);
  scales.appendChild(await text('Radius: sm 8 · md 12 · card 20 · pill 999', { type: 'body', color: C.light.foreground }));
  scales.appendChild(await text('Motion: press scale 0.97 · micro 120ms · enter 250ms · exit 180ms · celebration 1400ms · reduced motion required.', { type: 'bodySm', color: C.light.muted, width: 540 }));
  scales.appendChild(await text('Accessibility: 44pt touch targets, visible input labels, no color-only meaning, screen-reader states, dynamic type, loading/empty/error/success states for every flow.', { type: 'bodySm', color: C.light.muted, width: 540 }));
  page.appendChild(scales);
}

async function buildComponents(page) {
  figma.currentPage = page;
  await addTitle(page, 'Reusable Components', 'High-fidelity component mockups matching the React Native primitives in src/components/ui and the app-specific dashboard/check-in patterns.');

  const sectionData = [
    ['Buttons', 48, 316],
    ['Inputs', 516, 316],
    ['Selectors', 984, 316],
    ['Cards & Data', 48, 830],
    ['Feedback & Surfaces', 516, 830],
    ['Navigation Patterns', 984, 830],
  ];
  for (const [name, x, y] of sectionData) {
    const s = autoFrame(name, x, y, 420, solid(C.dark.card), 'VERTICAL', S.base, S.lg);
    s.cornerRadius = R.card;
    stroke(s, C.dark.border, 1);
    s.appendChild(await text(name, { type: 'h2', color: C.dark.foreground }));
    page.appendChild(s);
  }
  const sections = Object.fromEntries(page.children.filter((n) => sectionData.some((s) => s[0] === n.name)).map((n) => [n.name, n]));

  sections.Buttons.appendChild(await button('Continue', 'primary', 'dark'));
  sections.Buttons.appendChild(await button('Back', 'secondary', 'dark'));
  sections.Buttons.appendChild(await button('Save draft', 'ghost', 'dark'));
  sections.Buttons.appendChild(await button('Loading', 'primary', 'dark', 'loading'));
  sections.Buttons.appendChild(await button('Disabled', 'secondary', 'dark', 'disabled'));
  sections.Buttons.appendChild(await button('With icon', 'primary', 'dark', 'default', true));

  sections.Inputs.appendChild(await input('Email', 'name@example.com', 'default', 'dark', true));
  sections.Inputs.appendChild(await input('Full name', 'Amal Khan', 'focused', 'dark', true));
  sections.Inputs.appendChild(await input('Password', '••••••••', 'default', 'dark', true, true));
  sections.Inputs.appendChild(await input('Weight', 'abc', 'error', 'dark', false));
  sections.Inputs.appendChild(await input('Disabled', 'Unavailable', 'disabled', 'dark', false));

  sections.Selectors.appendChild(await segmented('dark', false));
  sections.Selectors.appendChild(await segmented('dark', true));
  sections.Selectors.appendChild(await optionRow('Mostly consistent', true, 'dark'));
  sections.Selectors.appendChild(await optionRow('Weekdays only', false, 'dark'));
  sections.Selectors.appendChild(await ratingRow('dark'));
  sections.Selectors.appendChild(await stepper('dark'));
  sections.Selectors.appendChild(await chip('Same as yesterday', 'dark', true, true));
  sections.Selectors.appendChild(await chip('Upcoming', 'dark', false, false));

  sections['Cards & Data'].appendChild(await cardMock('dark'));
  sections['Cards & Data'].appendChild(await cardMock('light', true));
  sections['Cards & Data'].appendChild(await metricCard('Weight', '82.4', 'kg · -0.8 last 7 days', 'primary', 'dark'));
  sections['Cards & Data'].appendChild(await metricCard('Energy', '8', '/10 average', 'gold', 'dark'));
  sections['Cards & Data'].appendChild(await progressBar(0.72, 'primary', 'dark'));
  sections['Cards & Data'].appendChild(await progressBar(0.44, 'success', 'dark'));
  const badgeRow = autoFrame('Badges', 0, 0, 320, null, 'HORIZONTAL', S.sm, 0);
  badgeRow.appendChild(await badge('Synced', 'success', 'dark'));
  badgeRow.appendChild(await badge('PR', 'gold', 'dark'));
  badgeRow.appendChild(await badge('Draft', 'neutral', 'dark'));
  sections['Cards & Data'].appendChild(badgeRow);

  sections['Feedback & Surfaces'].appendChild(await emptyState('dark'));
  sections['Feedback & Surfaces'].appendChild(await errorState('dark'));
  const celebration = autoFrame('Celebration', 0, 0, 320, solid(C.dark.card), 'VERTICAL', S.md, S.xl);
  celebration.counterAxisAlignItems = 'CENTER';
  celebration.cornerRadius = R.card;
  stroke(celebration, C.dark.border, 1);
  celebration.appendChild(ellipse('Success halo', 0, 0, 72, 72, solid(C.dark.success, 0.16)));
  celebration.appendChild(await text('🔥 13-day streak', { type: 'h1', color: C.dark.foreground, align: 'CENTER' }));
  celebration.appendChild(await text('Logged. Your coach sees this.', { type: 'bodySm', color: C.dark.muted, align: 'CENTER' }));
  sections['Feedback & Surfaces'].appendChild(celebration);
  const sheet = autoFrame('Bottom Sheet', 0, 0, 320, solid(C.dark.card), 'VERTICAL', S.base, S.base);
  sheet.cornerRadius = R.card;
  stroke(sheet, C.dark.border, 1);
  sheet.appendChild(await text('Choose country', { type: 'h2', color: C.dark.foreground }));
  sheet.appendChild(await input('Search', 'United Arab Emirates', 'focused', 'dark', false));
  sheet.appendChild(await optionRow('United Arab Emirates  +971', true, 'dark'));
  sections['Feedback & Surfaces'].appendChild(sheet);

  const tabs = frame('Bottom Tab Bar', 0, 0, 342, 76, solid(C.dark.elevated));
  tabs.cornerRadius = 24;
  stroke(tabs, C.dark.border, 1);
  const tabNames = ['Home', 'Plans', 'Check In', 'Logs', 'More'];
  for (let i = 0; i < tabNames.length; i += 1) {
    const active = i === 2;
    const tab = autoFrame(tabNames[i], 16 + i * 62, 12, 54, active ? solid(C.dark.primaryFill) : null, 'VERTICAL', 2, 0);
    tab.resize(54, 52);
    tab.primaryAxisSizingMode = 'FIXED';
    tab.counterAxisSizingMode = 'FIXED';
    tab.primaryAxisAlignItems = 'CENTER';
    tab.counterAxisAlignItems = 'CENTER';
    tab.cornerRadius = R.pill;
    tab.appendChild(ellipse('Icon', 0, 0, 18, 18, solid(active ? C.dark.onPrimary : C.dark.muted)));
    tab.appendChild(await text(tabNames[i], { type: 'label', color: active ? C.dark.onPrimary : C.dark.muted, uppercase: false, size: 9, lineHeight: 11 }));
    tabs.appendChild(tab);
  }
  sections['Navigation Patterns'].appendChild(tabs);
  const sticky = frame('Sticky Action Bar', 0, 0, 342, 88, solid(C.dark.card));
  stroke(sticky, C.dark.border, 1);
  const submit = await button('Submit · keeps your 12-day streak', 'primary', 'dark');
  submit.x = 16;
  submit.y = 16;
  submit.resize(310, 48);
  sticky.appendChild(submit);
  sections['Navigation Patterns'].appendChild(sticky);
  const week = autoFrame('Week Strip', 0, 0, 342, null, 'HORIZONTAL', S.sm, 0);
  for (const d of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) week.appendChild(await chip(d, 'dark', d !== 'S', false));
  sections['Navigation Patterns'].appendChild(week);
}

async function buildScreens(page) {
  figma.currentPage = page;
  await addTitle(page, 'Screens & UX Patterns', 'Representative high-fidelity mobile screens and behavioural notes for the shipped Dawnage app. Use these as the product documentation layer over the component system.');
  await screenAuth(48, 316, 'dark');
  await screenDashboard(486, 316, 'dark', false);
  await screenCheckIn(924, 316, 'dark');
  await screenQuestionnaire(48, 1210, 'dark');
  await screenDashboard(486, 1210, 'light', true);
  await screenSettings(924, 1210, 'dark');

  const ux = autoFrame('UX Principles', 48, 2100, 1266, solid(C.dark.card), 'VERTICAL', S.md, S.lg);
  ux.cornerRadius = R.card;
  stroke(ux, C.dark.border, 1);
  ux.appendChild(await text('UX Principles', { type: 'h2', color: C.dark.foreground }));
  const notes = [
    'Daily check-in must be the fastest flow in the app: stepper controls, same-as-yesterday, sticky submit, and payoff copy.',
    'Every query has loading, error, empty and success states. Skeletons should match the content they replace.',
    'Streaks motivate without guilt. If streak is zero, show a forward-looking prompt instead of a failure state.',
    'Charts need plain-language summaries and line-style differences. Do not rely on colour alone.',
    'DawnGlow is a signature, not wallpaper: auth and dashboard only unless one of those uses is removed.',
    'Forms validate on blur/submit, use visible labels, correct keyboards, inline errors, and keyboard-safe sticky actions.',
  ];
  for (const n of notes) ux.appendChild(await text(`• ${n}`, { type: 'bodySm', color: C.dark.muted, width: 1160 }));
  page.appendChild(ux);
}

async function createPages() {
  const existing = [...figma.root.children];
  let pages = [];
  for (let i = 0; i < 3; i += 1) {
    const p = existing[i] || figma.createPage();
    p.name = PAGE_NAMES[i];
    pages.push(p);
  }
  for (let i = 3; i < existing.length; i += 1) existing[i].remove();
  for (const p of pages) {
    figma.currentPage = p;
    for (const child of [...p.children]) child.remove();
    p.backgrounds = [solid('#ECECF1')];
  }
  return pages;
}

async function main() {
  const pages = await createPages();
  await buildFoundations(pages[0]);
  await buildComponents(pages[1]);
  await buildScreens(pages[2]);
  figma.currentPage = pages[0];
  figma.viewport.scrollAndZoomIntoView(pages[0].children);
  figma.notify('Dawnage design system created: 3 pages, high-fidelity components, and screen UX documentation.');
  figma.closePlugin();
}

main().catch((err) => {
  console.error(err);
  figma.notify(`Dawnage design-system build failed: ${err.message}`);
  figma.closePlugin();
});
