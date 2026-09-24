import { MotiView } from 'moti';
import { ActivityIndicator, Pressable, Text } from 'react-native';

type SubmitButtonProps = {
  label: string;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

export function SubmitButton({ label, loading = false, disabled = false, onPress }: SubmitButtonProps) {
  const blocked = loading || disabled;

  return (
    <Pressable accessibilityRole="button" disabled={blocked} onPress={onPress}>
      <MotiView
        animate={{ scale: blocked ? 0.98 : 1, opacity: blocked ? 0.7 : 1 }}
        transition={{ type: 'spring', damping: 16, stiffness: 240 }}
        className="h-14 items-center justify-center rounded-2xl bg-sky-600">
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text className="text-base font-semibold text-white">{label}</Text>
        )}
      </MotiView>
    </Pressable>
  );
}
