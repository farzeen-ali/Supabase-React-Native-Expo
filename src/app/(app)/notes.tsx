import { router } from 'expo-router';
import { FileText, Plus, Search } from 'lucide-react-native';
import { MotiView } from 'moti';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ItemCard } from '@/components/ItemCard';
import { ItemFormModal } from '@/components/ItemFormModal';
import { useCrudData } from '@/hooks/useCrudData';
import { hapticLight, hapticSuccess } from '@/lib/haptics';
import type { Note } from '@/lib/notes';
import { useAuth } from '@/providers/auth-provider';
import { useThemePreference } from '@/providers/theme-provider';

export default function NotesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { isDark } = useThemePreference();
  const crud = useCrudData(user?.id);
  const { error, setError } = crud;
  const [composerOpen, setComposerOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  useEffect(() => {
    if (!error) return undefined;
    const timer = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(timer);
  }, [error, setError]);

  const onRefresh = useCallback(() => {
    hapticLight();
    crud.refresh('pull');
  }, [crud]);

  const onCreate = useCallback(
    async (value: { title: string; body: string }) => {
      await crud.createNote(value);
      hapticSuccess();
    },
    [crud],
  );

  const onUpdate = useCallback(
    async (value: { title: string; body: string }) => {
      if (!editing) return;
      await crud.updateNote(editing.id, value);
      hapticSuccess();
    },
    [crud, editing],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-100 dark:bg-slate-950" edges={['top', 'left', 'right']}>
      <View className="flex-1 px-5 pt-2">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Pressable accessibilityRole="button" onPress={() => router.back()}>
              <Text className="text-sm font-medium text-sky-700 dark:text-sky-300">Dashboard</Text>
            </Pressable>
            <Text className="text-3xl font-bold text-slate-900 dark:text-white">Notes</Text>
          </View>
        </View>

        <View className="mb-4 flex-row items-center gap-2 rounded-2xl bg-white px-4 dark:bg-slate-900">
          <Search color={isDark ? '#94A3B8' : '#64748B'} size={18} />
          <TextInput
            value={crud.query}
            onChangeText={crud.setQuery}
            placeholder="Search notes"
            placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            className="h-12 flex-1 text-base text-slate-900 dark:text-white"
          />
        </View>

        {error ? (
          <MotiView from={{ opacity: 0, translateY: -8 }} animate={{ opacity: 1, translateY: 0 }} className="mb-3">
            <Text className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              {error}
            </Text>
          </MotiView>
        ) : null}

        {crud.undo ? (
          <View className="mb-3 flex-row gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                hapticLight();
                crud.undoDelete();
              }}
              className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 dark:bg-white">
              <Text className="text-center text-sm font-medium text-white dark:text-slate-900">Undo</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                hapticLight();
                crud.purgeNote(crud.undo?.note.id ?? '');
              }}
              className="flex-1 rounded-2xl bg-rose-600 px-4 py-3">
              <Text className="text-center text-sm font-medium text-white">Delete forever</Text>
            </Pressable>
          </View>
        ) : null}

        {crud.loading ? (
          <View className="gap-3">
            {[0, 1, 2].map((slot) => (
              <MotiView
                key={slot}
                from={{ opacity: 0.35 }}
                animate={{ opacity: 1 }}
                transition={{ type: 'timing', duration: 700, loop: true, repeatReverse: true }}
                className="h-24 rounded-3xl bg-slate-200 dark:bg-slate-800"
              />
            ))}
          </View>
        ) : (
          <FlatList
            data={crud.items}
            keyExtractor={(item) => item.id}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            windowSize={7}
            keyboardShouldPersistTaps="handled"
            refreshing={crud.refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={{ paddingBottom: insets.bottom + 96, flexGrow: 1 }}
            renderItem={({ item, index }) => (
              <ItemCard
                note={item}
                index={index}
                isDark={isDark}
                onPress={setEditing}
                onDelete={crud.removeNote}
              />
            )}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center gap-3 py-16">
                <FileText color={isDark ? '#94A3B8' : '#64748B'} size={42} />
                <Text className="text-center text-base text-slate-600 dark:text-slate-300">
                  No notes yet. Add one with the button below.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add note"
        onPress={() => {
          hapticLight();
          setComposerOpen(true);
        }}
        style={{ bottom: insets.bottom + 20 }}
        className="absolute right-5 h-16 w-16 items-center justify-center rounded-full bg-sky-600 shadow-lg">
        <Plus color="#FFFFFF" size={28} />
      </Pressable>

      <ItemFormModal
        visible={composerOpen}
        title="New note"
        onClose={() => setComposerOpen(false)}
        onSubmit={onCreate}
      />
      <ItemFormModal
        visible={editing != null}
        title="Edit note"
        initialTitle={editing?.title}
        initialBody={editing?.body}
        onClose={() => setEditing(null)}
        onSubmit={onUpdate}
      />
    </SafeAreaView>
  );
}
