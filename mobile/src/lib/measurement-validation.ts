export const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'thighs', label: 'Thighs' },
  { key: 'arms', label: 'Arms' },
] as const;

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]['key'];
export type MeasurementDraft = Record<MeasurementField, string>;
export type MeasurementErrors = Partial<Record<MeasurementField, string>>;

export const EMPTY_MEASUREMENT_DRAFT: MeasurementDraft = {
  chest: '',
  waist: '',
  hips: '',
  thighs: '',
  arms: '',
};

export function validateMeasurementValue(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const measurement = parseFloat(value);
  if (!Number.isFinite(measurement)) return 'Enter a number in centimetres.';
  if (measurement < 20 || measurement > 250) {
    return 'That looks off — expected 20–250 cm.';
  }
  return undefined;
}

export function validateMeasurementDraft(draft: MeasurementDraft): MeasurementErrors {
  const errors: MeasurementErrors = {};
  for (const field of MEASUREMENT_FIELDS) {
    const error = validateMeasurementValue(draft[field.key]);
    if (error) errors[field.key] = error;
  }
  return errors;
}
