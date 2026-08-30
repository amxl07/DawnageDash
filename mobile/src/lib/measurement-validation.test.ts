import {
  validateMeasurementDraft,
  validateMeasurementValue,
  type MeasurementDraft,
} from './measurement-validation';

describe('measurement validation', () => {
  it.each([
    ['', undefined],
    ['abc', 'Enter a number in centimetres.'],
    ['19', 'That looks off — expected 20–250 cm.'],
    ['251', 'That looks off — expected 20–250 cm.'],
    ['82.5', undefined],
  ])('validates %p', (value, expected) => {
    expect(validateMeasurementValue(value)).toBe(expected);
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
});
