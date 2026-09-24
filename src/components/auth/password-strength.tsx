import { MotiView } from 'moti';
import { Text, View } from 'react-native';

import { passwordRules, passwordStrength } from '@/lib/validation';

export function PasswordStrength({ password }: { password: string }) {
  const strength = passwordStrength(password);
  const barClass =
    strength.ratio === 1
      ? 'bg-emerald-500'
      : strength.ratio >= 0.6
        ? 'bg-amber-500'
        : 'bg-rose-500';

  return (
    <View className="gap-2">
      <View className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <MotiView
          animate={{ scaleX: Math.max(strength.ratio, password ? 0.08 : 0) }}
          transition={{ type: 'timing', duration: 220 }}
          style={{ transformOrigin: 'left' }}
          className={`h-2 w-full rounded-full ${barClass}`}
        />
      </View>
      <Text className="text-xs font-medium text-slate-600 dark:text-slate-300">{strength.label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {passwordRules.map((rule) => {
          const met = rule.test(password);
          return (
            <Text
              key={rule.id}
              className={`rounded-full px-2 py-1 text-xs ${
                met
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
              }`}>
              {rule.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
