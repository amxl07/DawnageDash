import { activityContent, type NativeActivity, type NativeSurfaceAdapter, type RestClock, type SurfaceLinks, type WorkoutProgress } from './model';

type Session = { run: number; lease: number; account: string; date: string; progress: WorkoutProgress | null };
const idleRest: RestClock = { endsAt: null, pausedRemainingMs: null };

/** One serialized native writer. App ownership never leaves this process. */
export class NativeSurfaceController {
  private account: string | null = null;
  private session: Session | null = null;
  private rest: RestClock = idleRest;
  private sequence = 0;
  private owned: { run: number; activity: NativeActivity } | null = null;
  private blockedRun: number | null = null;
  private signature = '';
  private needsReconcile = true;
  private adapter: Promise<NativeSurfaceAdapter | null> | null = null;
  private queue = Promise.resolve();

  constructor(private load: () => Promise<NativeSurfaceAdapter | null>, private links: () => SurfaceLinks | null, private now: () => number = () => Date.now()) {}

  setAccount(account: string | null): Promise<void> {
    if (account !== this.account) {
      this.account = account; this.session = null; this.rest = idleRest;
      this.blockedRun = null; this.needsReconcile = true;
    }
    return this.schedule();
  }

  claimWorkout(account: string, date: string): number | null {
    if (!account || account !== this.account) return null;
    const previous = this.session;
    const lease = ++this.sequence;
    // Returning to the same current workout adopts its activity. A different
    // date or an explicit end gets a fresh run and ends its predecessor first.
    this.session = { run: previous?.date === date ? previous.run : lease, lease, account, date, progress: previous?.date === date ? previous.progress : null };
    return lease;
  }

  updateWorkout(lease: number, progress: WorkoutProgress): Promise<void> {
    if (this.session?.lease !== lease || this.session.account !== this.account) return Promise.resolve();
    this.session = { ...this.session, progress };
    return this.schedule();
  }

  updateRest(account: string, rest: RestClock): Promise<void> {
    if (account !== this.account) return Promise.resolve();
    this.rest = rest;
    return this.schedule();
  }

  endWorkout(lease: number): Promise<void> {
    if (this.session?.lease !== lease) return Promise.resolve();
    this.session = null; this.rest = idleRest;
    return this.schedule();
  }

  reconcile(): Promise<void> {
    this.needsReconcile = true;
    this.signature = '';
    return this.schedule();
  }

  private schedule(): Promise<void> {
    // Every queued operation reads the newest desired state, coalescing bursts.
    // Errors are contained here: ActivityKit is an enhancement to the logger.
    this.queue = this.queue.then(() => this.applyLatest()).catch(() => { this.needsReconcile = true; });
    return this.queue;
  }

  private getAdapter(): Promise<NativeSurfaceAdapter | null> {
    if (!this.adapter) this.adapter = this.load().then((adapter) => {
      const links = this.links();
      if (!adapter || !links) return null;
      adapter.initialize(links);
      return adapter;
    }).catch(() => null);
    return this.adapter;
  }

  private async endAndConfirm(activity: NativeActivity, adapter: NativeSurfaceAdapter): Promise<boolean> {
    try {
      await activity.end('immediate');
      return true;
    } catch {
      // ActivityKit also rejects end when the system has already removed an
      // instance. Verify absence before releasing ownership or starting again.
      // One end attempt and one read per operation; later events can retry.
      this.needsReconcile = true;
      try { return !(await adapter.getInstances()).some((instance) => instance.getId() === activity.getId()); }
      catch { return false; }
    }
  }

  private async endOwned(adapter: NativeSurfaceAdapter): Promise<boolean> {
    if (!this.owned) return true;
    if (!(await this.endAndConfirm(this.owned.activity, adapter))) return false;
    this.owned = null; this.signature = '';
    return true;
  }

  private async applyLatest() {
    const adapter = await this.getAdapter();
    const links = this.links();
    if (!adapter || !links) return;

    if (this.needsReconcile) {
      this.needsReconcile = false;
      try {
        const instances = await adapter.getInstances();
        const keep = this.owned && this.owned.run === this.session?.run ? this.owned.activity.getId() : null;
        for (const instance of instances) {
          if (instance.getId() !== keep && !(await this.endAndConfirm(instance, adapter))) return;
        }
        if (this.owned && !instances.some((instance) => instance.getId() === keep)) {
          // Respect a user-dismissed activity instead of recreating it on every foreground.
          if (keep) this.blockedRun = this.owned.run;
          this.owned = null;
        }
      } catch {
        this.needsReconcile = true;
        return; // Never start a duplicate when orphan cleanup could not finish.
      }
    }

    const session = this.session;
    if (this.owned && this.owned.run !== session?.run) {
      if (!(await this.endOwned(adapter))) return;
    }
    if (!session?.progress || session.account !== this.account || this.blockedRun === session.run) return;
    const signature = JSON.stringify([session.run, session.progress, this.rest]);
    if (this.owned && signature === this.signature) return;
    const { props, staleDate } = activityContent(session.progress, this.rest, this.now());
    if (this.owned) {
      await this.owned.activity.update(props, staleDate);
      this.signature = signature;
      return;
    }
    try {
      const activity = await adapter.start(props, links.workout, staleDate);
      this.owned = { run: session.run, activity };
      if (this.session?.run !== session.run || this.account !== session.account) {
        await this.endOwned(adapter);
        return;
      }
      this.signature = signature;
    } catch {
      this.blockedRun = session.run;
    }
  }
}
