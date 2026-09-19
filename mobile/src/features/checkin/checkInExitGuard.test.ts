import { hasCheckInExitGuard, registerCheckInExitGuard, requestCheckInTabExit } from './checkInExitGuard';

it('waits for an acknowledged exit and collapses repeated taps into one replay', async () => {
  let resolve!: (saved: boolean) => void;
  const saved = new Promise<boolean>((done) => { resolve = done; });
  const navigation = jest.fn();
  const cleanup = registerCheckInExitGuard(() => saved);
  const first = requestCheckInTabExit(navigation);
  const second = requestCheckInTabExit(navigation);
  expect(navigation).not.toHaveBeenCalled();
  resolve(true);
  await Promise.all([first, second]);
  expect(navigation).toHaveBeenCalledTimes(1);
  cleanup();
  expect(hasCheckInExitGuard()).toBe(false);
});

it('retains the exact intended target after a failed flush for deliberate discard', async () => {
  let replay!: () => void;
  const navigation = jest.fn();
  const cleanup = registerCheckInExitGuard(async (next) => { replay = next; return false; });
  await requestCheckInTabExit(navigation);
  expect(navigation).not.toHaveBeenCalled();
  replay();
  expect(navigation).toHaveBeenCalledTimes(1);
  cleanup();
});

it('does not replay a previous account or blurred screen navigation', async () => {
  let resolve!: (saved: boolean) => void;
  const saved = new Promise<boolean>((done) => { resolve = done; });
  const navigation = jest.fn();
  const cleanup = registerCheckInExitGuard(() => saved);
  const exit = requestCheckInTabExit(navigation);
  cleanup();
  const cleanupNew = registerCheckInExitGuard(async () => true);
  resolve(true);
  await exit;
  expect(navigation).not.toHaveBeenCalled();
  cleanupNew();
});

it('replays a retained discard action at most once', async () => {
  let replay!: () => void;
  const navigation = jest.fn();
  const cleanup = registerCheckInExitGuard(async (next) => { replay = next; return false; });
  await requestCheckInTabExit(navigation);
  replay(); replay();
  expect(navigation).toHaveBeenCalledTimes(1);
  cleanup();
});
