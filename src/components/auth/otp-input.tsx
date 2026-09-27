import { MotiView } from 'moti';
import { useRef, useState } from 'react';
import { Pressable, TextInput } from 'react-native';

import { hapticLight } from '@/lib/haptics';
import { useThemePreference } from '@/providers/theme-provider';

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
};

const LENGTH = 6;

export function OtpInput({ value, onChange, onComplete, disabled = false }: OtpInputProps) {
  const { isDark } = useThemePreference();
  const inputs = useRef<(TextInput | null)[]>([]);
  const [focused, setFocused] = useState(0);
  const digits = Array.from({ length: LENGTH }, (_, index) => value[index] ?? '');

  function commit(nextDigits: string[], focusIndex: number) {
    const next = nextDigits.join('').replace(/\D/g, '').slice(0, LENGTH);
    onChange(next);
    const target = Math.max(0, Math.min(focusIndex, LENGTH - 1));
    inputs.current[target]?.focus();
    if (next.length === LENGTH) onComplete?.(next);
  }

  function onChangeText(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, '');
    if (!cleaned) {
      const nextDigits = [...digits];
      nextDigits[index] = '';
      commit(nextDigits, index);
      return;
    }

    hapticLight();

    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, LENGTH).split('');
      const nextDigits = Array.from({ length: LENGTH }, (_, slot) => pasted[slot] ?? '');
      commit(nextDigits, Math.min(pasted.length, LENGTH) - 1);
      return;
    }

    const nextDigits = [...digits];
    nextDigits[index] = cleaned;
    commit(nextDigits, index < LENGTH - 1 ? index + 1 : index);
  }

  function onKeyPress(index: number, key: string) {
    if (key !== 'Backspace' || digits[index]) return;
    if (index === 0) return;
    const nextDigits = [...digits];
    nextDigits[index - 1] = '';
    commit(nextDigits, index - 1);
  }

  return (
    <Pressable
      accessibilityRole="none"
      className="flex-row justify-between gap-2"
      onPress={() => inputs.current[Math.min(value.length, LENGTH - 1)]?.focus()}>
      {digits.map((digit, index) => {
        const active = focused === index;
        return (
          <MotiView
            key={index}
            animate={{ scale: active ? 1.06 : 1 }}
            transition={{ type: 'spring', damping: 14, stiffness: 260 }}
            className={`h-16 flex-1 items-center justify-center rounded-2xl border-2 bg-white dark:bg-slate-900 ${
              active ? 'border-sky-500' : 'border-slate-200 dark:border-slate-700'
            }`}>
            <TextInput
              ref={(node) => {
                inputs.current[index] = node;
              }}
              value={digit}
              onChangeText={(text) => onChangeText(index, text)}
              onKeyPress={({ nativeEvent }) => onKeyPress(index, nativeEvent.key)}
              onFocus={() => setFocused(index)}
              editable={!disabled}
              keyboardType="number-pad"
              inputMode="numeric"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              maxLength={index === 0 ? LENGTH : 1}
              selectTextOnFocus
              caretHidden
              className="h-16 w-full text-center text-2xl font-semibold text-slate-900 dark:text-white"
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
            />
          </MotiView>
        );
      })}
    </Pressable>
  );
}
