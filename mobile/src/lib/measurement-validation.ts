export const MEASUREMENT_FIELDS = [
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'hips', label: 'Hips' },
  { key: 'thighs', label: 'Thighs' },
  { key: 'arms', label: 'Arms' },
] as const;

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]['key'];
export type MeasurementDraft = Record<MeasurementField, string>;
export type MeasurementValues = Record<MeasurementField, number | null>;
export type MeasurementErrors = Partial<Record<MeasurementField, string>>;
export type ParsedMeasurementValue = { value: number | null; error?: string };
export type ParsedMeasurementDraft = {
  values: MeasurementValues;
  errors: MeasurementErrors;
};

export const EMPTY_MEASUREMENT_DRAFT: MeasurementDraft = {
  chest: '',
  waist: '',
  hips: '',
  thighs: '',
  arms: '',
};

const DECIMAL_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

export function parseMeasurementValue(value: string): ParsedMeasurementValue {
  const normalized = value.trim();
  if (!normalized) return { value: null };
  if (!DECIMAL_PATTERN.test(normalized)) {
    return { value: null, error: 'Enter a number in centimetres.' };
  }

  const measurement = Number(normalized);
  if (!Number.isFinite(measurement)) {
    return { value: null, error: 'Enter a number in centimetres.' };
  }
  if (measurement < 20 || measurement > 250) {
    return { value: null, error: 'That looks off — expected 20–250 cm.' };
  }
  return { value: measurement };
}

export function validateMeasurementValue(value: string): string | undefined {
  return parseMeasurementValue(value).error;
}

export function parseMeasurementDraft(draft: MeasurementDraft): ParsedMeasurementDraft {
  const errors: MeasurementErrors = {};
  const values = {} as MeasurementValues;
  for (const field of MEASUREMENT_FIELDS) {
    const parsed = parseMeasurementValue(draft[field.key]);
    values[field.key] = parsed.value;
    if (parsed.error) errors[field.key] = parsed.error;
  }
  return { values, errors };
}

export function validateMeasurementDraft(draft: MeasurementDraft): MeasurementErrors {
  const { errors } = parseMeasurementDraft(draft);
  return errors;
}
