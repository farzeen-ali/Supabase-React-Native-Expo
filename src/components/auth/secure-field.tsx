import { Eye, EyeOff } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useState } from 'react';
import { Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useThemePreference } from '@/providers/theme-provider';

type SecureFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  secure?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
};

export function SecureField({
  label,
  value,
  onChangeText,
  error,
  secure = false,
  keyboardType = 'default',
  textContentType,
  autoComplete,
}: SecureFieldProps) {
  const { isDark } = useThemePreference();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);
  const iconColor = isDark ? '#E5E7EB' : '#374151';

  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</Text>
      <MotiView
        animate={{ scale: focused ? 1.01 : 1 }}
        transition={{ type: 'spring', damping: 18, stiffness: 220 }}>
        <View
          className={`flex-row items-center rounded-2xl border bg-white px-4 dark:bg-slate-900 ${
            error
              ? 'border-rose-500'
              : focused
                ? 'border-sky-500'
                : 'border-slate-200 dark:border-slate-700'
          }`}>
          <TextInput
            value={value}
            onChangeText={onChangeText}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            secureTextEntry={secure && !visible}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType={keyboardType}
            textContentType={textContentType}
            autoComplete={autoComplete}
            importantForAutofill="yes"
            placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
            className="h-14 flex-1 text-base text-slate-900 dark:text-slate-50"
          />
          {secure ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={visible ? 'Hide password' : 'Show password'}
              hitSlop={8}
              onPress={() => setVisible((current) => !current)}>
              {visible ? <EyeOff color={iconColor} size={20} /> : <Eye color={iconColor} size={20} />}
            </Pressable>
          ) : null}
        </View>
      </MotiView>
      {error ? (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 180 }}>
          <Text className="text-sm text-rose-600 dark:text-rose-400">{error}</Text>
        </MotiView>
      ) : null}
    </View>
  );
}
