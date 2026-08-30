import {
  parseMeasurementDraft,
  parseMeasurementValue,
  validateMeasurementDraft,
  validateMeasurementValue,
  type MeasurementDraft,
} from './measurement-validation';

describe('measurement validation', () => {
  it.each([
    ['', undefined],
    ['   ', undefined],
    ['abc', 'Enter a number in centimetres.'],
    ['82abc', 'Enter a number in centimetres.'],
    ['82,5', 'Enter a number in centimetres.'],
    ['-1', 'That looks off — expected 20–250 cm.'],
    ['19', 'That looks off — expected 20–250 cm.'],
    ['251', 'That looks off — expected 20–250 cm.'],
    ['82.5', undefined],
  ])('validates %p', (value, expected) => {
    expect(validateMeasurementValue(value)).toBe(expected);
  });

  it('returns one normalized value result for validation and persistence', () => {
    expect(parseMeasurementValue(' 82.5 ')).toEqual({ value: 82.5 });
    expect(parseMeasurementValue('   ')).toEqual({ value: null });
    expect(parseMeasurementValue('82abc')).toEqual({
      value: null,
      error: 'Enter a number in centimetres.',
    });
  });

  it('keeps draft errors keyed to their measurement field', () => {
    const draft: MeasurementDraft = {
      chest: 'abc',
      waist: '19',
      hips: '251',
      thighs: '82.5',
      arms: '',
    };

    expect(validateMeasurementDraft(draft)).toEqual({
      chest: 'Enter a number in centimetres.',
      waist: 'That looks off — expected 20–250 cm.',
      hips: 'That looks off — expected 20–250 cm.',
    });
  });

  it('returns nullable parsed values alongside keyed draft errors', () => {
    const draft: MeasurementDraft = {
      chest: '   ',
      waist: ' 82.5 ',
      hips: '82,5',
      thighs: '55',
      arms: '34',
    };

    expect(parseMeasurementDraft(draft)).toEqual({
      values: { chest: null, waist: 82.5, hips: null, thighs: 55, arms: 34 },
      errors: { hips: 'Enter a number in centimetres.' },
    });
  });
});
