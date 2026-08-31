import { View } from 'react-native';

import { CheckInForm, type FormState } from '@/components/checkin/CheckInForm';
import type { DailyCheckIn } from '@/types/db';
import { spacing } from '@/theme';

import type { CheckInHistory } from '../history';

type Props = {
  form: FormState;
  setForm: (updater: (previous: FormState) => FormState) => void;
  previous: DailyCheckIn | null;
  errors: Partial<Record<keyof FormState, string>>;
  history: CheckInHistory;
};

export function CheckInPanel({ form, setForm, previous, errors, history }: Props) {
  return (
    <View testID="checkin-single-scroll-panel" style={{ gap: spacing.lg }}>
      {(['readiness', 'recovery', 'adherence'] as const).map((step) => (
        <CheckInForm
          key={step}
          form={form}
          setForm={setForm}
          previous={previous}
          step={step}
          errors={errors}
          history={history}
          showCarryForward
        />
      ))}
      <CheckInForm
        form={form}
        setForm={setForm}
        previous={previous}
        step="finish"
        errors={errors}
        history={history}
        showCarryForward
        hideFinishSummary
      />
    </View>
  );
}

