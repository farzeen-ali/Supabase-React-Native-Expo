import { BlurView } from 'expo-blur';
import { Trash2 } from 'lucide-react-native';
import { MotiView } from 'moti';
import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import type { Note } from '@/lib/notes';
import { hapticLight } from '@/lib/haptics';

type ItemCardProps = {
  note: Note;
  index: number;
  isDark: boolean;
  onPress: (note: Note) => void;
  onDelete: (id: string) => void;
};

function ItemCardComponent({ note, index, isDark, onPress, onDelete }: ItemCardProps) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'spring', delay: Math.min(index, 8) * 40, damping: 18 }}>
      <Swipeable
        friction={2}
        rightThreshold={72}
        overshootRight={false}
        onSwipeableOpen={(direction) => {
          if (direction === 'right') {
            hapticLight();
            onDelete(note.id);
          }
        }}
        renderRightActions={() => (
          <View className="mb-3 ml-3 w-20 items-center justify-center rounded-3xl bg-rose-600">
            <Trash2 color="#FFFFFF" size={22} />
          </View>
        )}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            hapticLight();
            onPress(note);
          }}
          className="mb-3 overflow-hidden rounded-3xl">
          <BlurView intensity={isDark ? 28 : 48} tint={isDark ? 'dark' : 'light'}>
            <View className="gap-2 border border-white/40 bg-white/70 px-5 py-4 dark:border-white/10 dark:bg-slate-900/70">
              <Text className="text-lg font-semibold text-slate-900 dark:text-white" numberOfLines={1}>
                {note.title}
              </Text>
              <Text className="text-sm leading-5 text-slate-600 dark:text-slate-300" numberOfLines={3}>
                {note.body || 'No details yet'}
              </Text>
            </View>
          </BlurView>
        </Pressable>
      </Swipeable>
    </MotiView>
  );
}

export const ItemCard = memo(ItemCardComponent);
