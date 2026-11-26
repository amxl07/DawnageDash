import { useEffect } from 'react';
import { act, create } from 'react-test-renderer';

import { NumericCommitProvider, useNumericCommits } from './NumericCommitProvider';

function setup() {
  let commits!: NonNullable<ReturnType<typeof useNumericCommits>>;
  let valid = true;
  let saved = 0;
  const focus = jest.fn();
  function Entries() {
    const api = useNumericCommits()!;
    commits = api;
    useEffect(() => {
      const first = api.register('Water', () => { if (!valid) return false; saved = 2.25; return true; }, { read: () => saved, replace: () => {}, focus: () => focus('Water') });
      const second = api.register('Steps', () => true, { read: () => 8000, replace: () => {}, focus: () => focus('Steps') });
      return () => { first(); second(); };
    }, [api]);
    return null;
  }
  let tree!: ReturnType<typeof create>;
  act(() => { tree = create(<NumericCommitProvider><Entries /></NumericCommitProvider>); });
  return { commits, focus, saved: () => saved, invalidate: () => { valid = false; }, unmount: () => act(() => tree.unmount()) };
}

it('commits the current value before moving to the next registered input', () => {
  const form = setup();
  expect(form.commits.move('Water', 1)).toBe('moved');
  expect(form.saved()).toBe(2.25);
  expect(form.focus).toHaveBeenCalledWith('Steps');
  expect(form.commits.move('Steps', -1)).toBe('moved');
  expect(form.focus).toHaveBeenLastCalledWith('Water');
  form.unmount();
});

it('keeps invalid text in place and never focuses the next input', () => {
  const form = setup();
  form.invalidate();
  expect(form.commits.move('Water', 1)).toBe('invalid');
  expect(form.focus).not.toHaveBeenCalled();
  expect(form.saved()).toBe(0);
  form.unmount();
});

it('reports the last input and removes unmounted focus targets', () => {
  const form = setup();
  expect(form.commits.canMove('Water', -1)).toBe(false);
  expect(form.commits.canMove('Water', 1)).toBe(true);
  expect(form.commits.move('Steps', 1)).toBe('end');
  form.unmount();
  expect(form.commits.canMove('Water', 1)).toBe(false);
});
