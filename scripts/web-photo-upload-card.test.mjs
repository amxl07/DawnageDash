import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transform } from 'esbuild';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

// Exercise the actual web card. Only UI/storage/photo-signing boundaries are injected.
const owner = '11111111-1111-4111-8111-111111111111';
const reference = `${owner}/2026-09-19/front_123.jpg`;
let viewer = owner;
let controls = [];
let input;
const uploaded = [];
const context = vm.createContext({
  Date, Blob,
  URL: { createObjectURL: () => 'blob:local-fixture', revokeObjectURL: () => {} },
  Image: class { width = 1200; height = 1600; set src(_source) { queueMicrotask(() => this.onload()); } },
  document: { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: (callback) => callback(new Blob(['fake'], { type: 'image/jpeg' })) }) },
});
const captureElement = (factory) => (type, props, key) => {
  if (type === 'input') input = props;
  return factory(type, props, key);
};
const icons = Object.fromEntries(['Loader2', 'Upload', 'X', 'Image', 'Download'].map(name => [name, () => null]));
const mocks = {
  react: React,
  'react/jsx-runtime': { ...jsxRuntime, jsx: captureElement(jsxRuntime.jsx), jsxs: captureElement(jsxRuntime.jsxs) },
  '@/components/ui/button': { Button: (props) => { controls.push(props); return React.createElement('button', { type: props.type, disabled: props.disabled, title: props.title }); } },
  'lucide-react': icons,
  '@/lib/supabase': { supabase: { storage: { from: () => ({ upload: async (path) => { uploaded.push(path); return { error: null }; } }) } } },
  '@/contexts/AuthContext': { useAuth: () => ({ user: { id: viewer } }) },
  '@/hooks/usePrivatePhotoUrl': { usePrivatePhotoUrl: () => ({ url: null, loading: false, refresh: async () => {} }) },
  '@/lib/utils': { cn: (...values) => values.join(' ') },
  '@/hooks/use-toast': { useToast: () => ({ toast() {} }) },
};
async function load(url) {
  const { code } = await transform(await readFile(url, 'utf8'), { loader: url.pathname.endsWith('.tsx') ? 'tsx' : 'ts', format: 'esm', jsx: 'automatic' });
  const module = new vm.SourceTextModule(code, { context, identifier: url.href });
  await module.link(async name => {
    if (mocks[name]) return new vm.SyntheticModule(Object.keys(mocks[name]), function () { for (const [key, value] of Object.entries(mocks[name])) this.setExport(key, value); }, { context });
    if (name === '@shared/progress-photos') return load(new URL('../shared/progress-photos.ts', import.meta.url));
    throw new Error(`Unexpected dependency ${name}`);
  });
  return module;
}
const module = await load(new URL('../client/src/components/PhotoUploadCard.tsx', import.meta.url));
await module.evaluate();
const Card = module.namespace.PhotoUploadCard;
function render(props = {}) {
  controls = [];
  input = undefined;
  renderToStaticMarkup(React.createElement(Card, { label: 'Front View', currentReference: reference, userId: owner, dateStr: '2026-09-19', onUpload() {}, onDelete() {}, ...props }));
  return Object.fromEntries(controls.filter(control => control.title).map(control => [control.title, control]));
}

test('failed signing retains owner Replace/Remove, hides Download, and replacement emits a path', async () => {
  viewer = owner;
  let removed = 0;
  let replacement;
  const actions = render({ onDelete: () => { removed += 1; }, onUpload: (value) => { replacement = value; } });
  assert.ok(actions.Replace, 'Replace must remain available when signing fails');
  assert.ok(actions.Remove, 'Remove must remain available when signing fails');
  assert.equal(actions.Download, undefined);
  assert.equal(actions.Replace.disabled, false);
  assert.equal(actions.Remove.disabled, false);
  let chose = 0;
  input.ref.current = { click: () => { chose += 1; }, value: '' };
  actions.Replace.onClick();
  assert.equal(chose, 1);
  actions.Remove.onClick();
  assert.equal(removed, 1);
  await input.onChange({ target: { files: [{ type: 'image/jpeg', size: 100 }] } });
  assert.match(replacement, new RegExp(`^${owner}/2026-09-19/front_view_[0-9]+\\.jpg$`));
  assert.equal(replacement, uploaded.at(-1));
});

test('disabled or different-account cards cannot choose, remove, or upload a saved reference', async () => {
  for (const configuration of [{ viewer: owner, disabled: true }, { viewer: '22222222-2222-4222-8222-222222222222', disabled: false }]) {
    viewer = configuration.viewer;
    let removed = 0;
    let chose = 0;
    const beforeUploads = uploaded.length;
    const actions = render({ disabled: configuration.disabled, onDelete: () => { removed += 1; } });
    input.ref.current = { click: () => { chose += 1; }, value: '' };
    assert.equal(actions.Replace.disabled, true);
    assert.equal(actions.Remove.disabled, true);
    actions.Replace.onClick();
    actions.Remove.onClick();
    await input.onChange({ target: { files: [{ type: 'image/jpeg', size: 100 }] } });
    assert.equal(chose, 0);
    assert.equal(removed, 0);
    assert.equal(uploaded.length, beforeUploads);
  }
});
