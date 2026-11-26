import AsyncStorage from '@react-native-async-storage/async-storage';

export type ProfileForm = {
  name: string; phone: string; country: string; timezone: string;
  goal: string; injuries: string; allergies: string; workoutDays: string; medicalCondition: string;
};
export type ProfileSaveRecovery = {
  version: 1;
  id: string;
  userId: string;
  phase: 'prepared' | 'profile-saved';
  form: ProfileForm;
  assessmentPatch?: Record<string, unknown>;
  profileDataPatch?: Record<string, unknown>;
  profileFieldsPatch?: Record<string, unknown>;
};

const fields: (keyof ProfileForm)[] = ['name', 'phone', 'country', 'timezone', 'goal', 'injuries', 'allergies', 'workoutDays', 'medicalCondition'];
const key = (userId: string) => 'profile-save-recovery:' + userId;
const writes = new Map<string, Promise<unknown>>();
const operations = new Map<string, Promise<unknown>>();
let sequence = 0;

function serialized<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  const task = (writes.get(userId) ?? Promise.resolve()).catch(() => {}).then(operation);
  writes.set(userId, task);
  void task.finally(() => { if (writes.get(userId) === task) writes.delete(userId); }).catch(() => {});
  return task;
}

async function read(userId: string): Promise<ProfileSaveRecovery | null> {
  const raw = await AsyncStorage.getItem(key(userId));
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Profile recovery is unreadable.');
  const item = value as Partial<ProfileSaveRecovery>;
  if (item.version !== 1 || item.userId !== userId || typeof item.id !== 'string' || !item.id ||
    (item.phase !== 'prepared' && item.phase !== 'profile-saved') || !item.form ||
    fields.some((field) => typeof item.form?.[field] !== 'string')) throw new Error('Profile recovery is unreadable.');
  return item as ProfileSaveRecovery;
}

export function readProfileSaveRecovery(userId: string): Promise<ProfileSaveRecovery | null> {
  return serialized(userId, () => read(userId));
}

/** Network work is separate from storage serialization and survives screen unmounts. */
export function runProfileSaveOperation<T>(userId: string, operation: () => Promise<T>): Promise<T> {
  const task = (operations.get(userId) ?? Promise.resolve()).catch(() => {}).then(operation);
  operations.set(userId, task);
  void task.finally(() => { if (operations.get(userId) === task) operations.delete(userId); }).catch(() => {});
  return task;
}

/** A new editor must not reconcile a prepared intent while its old writer is in flight. */
export async function waitForProfileSaveOperation(userId: string): Promise<void> {
  while (operations.has(userId)) await operations.get(userId)?.catch(() => {});
}

/** Acknowledged before changing either remote row. This journal has no draft TTL. */
export function prepareProfileSave(userId: string, form: ProfileForm, patches: Pick<ProfileSaveRecovery, 'assessmentPatch' | 'profileDataPatch' | 'profileFieldsPatch'> = {}): Promise<ProfileSaveRecovery> {
  const entry: ProfileSaveRecovery = { version: 1, id: Date.now() + ':' + ++sequence + ':' + Math.random().toString(36).slice(2), userId, phase: 'prepared', form: { ...form }, ...patches };
  return serialized(userId, async () => {
    await AsyncStorage.setItem(key(userId), JSON.stringify(entry));
    return entry;
  });
}

export function markProfileRowSaved(userId: string, id: string): Promise<boolean> {
  return serialized(userId, async () => {
    const entry = await read(userId);
    if (!entry || entry.id !== id) return false;
    await AsyncStorage.setItem(key(userId), JSON.stringify({ ...entry, phase: 'profile-saved' }));
    return true;
  });
}

/** An older completion cannot delete a newer local intent. */
export function clearProfileSaveRecovery(userId: string, id: string): Promise<boolean> {
  return serialized(userId, async () => {
    const entry = await read(userId);
    if (!entry) return true;
    if (entry.id !== id) return false;
    await AsyncStorage.removeItem(key(userId));
    return true;
  });
}

export function profileMatchesRecovery(profile: {
  full_name: string | null; phone_number: string | null; country: string | null;
  profile_data: Record<string, unknown> | null;
}, form: ProfileForm, dataPatch?: Record<string, unknown>, fieldsPatch?: Record<string, unknown>): boolean {
  const expected = fieldsPatch ?? { full_name: form.name, phone_number: form.phone, country: form.country };
  if (!Object.entries(expected).every(([key,value]) => ((profile as unknown as Record<string, unknown>)[key] ?? '') === value)) return false;
  return (dataPatch ? Object.keys(dataPatch) : ['timezone', 'goal', 'injuries', 'allergies', 'workoutDays', 'medicalCondition']).every((field) => (profile.profile_data?.[field] ?? '') === form[field as keyof ProfileForm]);
}

/** Restore only fields owned by a narrow journal over current canonical facts.
 * Older journals lack masks and retain their original explicit full-form intent.
 */
export function restoreProfileForm(saved: ProfileForm, entry: ProfileSaveRecovery): ProfileForm {
  if (entry.phase === 'prepared' && (!entry.profileFieldsPatch || !entry.profileDataPatch || !entry.assessmentPatch)) return { ...entry.form };
  const next = { ...saved };
  const assign = (patch: Record<string, unknown> | undefined, mapping: Record<string, keyof ProfileForm>) => {
    for (const [key, field] of Object.entries(mapping)) {
      if (!patch || Object.prototype.hasOwnProperty.call(patch, key)) next[field] = entry.form[field];
    }
  };
  if (entry.phase === 'prepared') {
    assign(entry.profileFieldsPatch, { full_name: 'name', phone_number: 'phone', country: 'country' });
    assign(entry.profileDataPatch, { timezone: 'timezone', goal: 'goal', injuries: 'injuries', allergies: 'allergies', workoutDays: 'workoutDays', medicalCondition: 'medicalCondition' });
  }
  assign(entry.assessmentPatch, { q14: 'goal', q56: 'injuries', q64: 'allergies', q33: 'workoutDays' });
  return next;
}
