import { MotiView } from 'moti';
import { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubmitButton } from '@/components/auth/submit-button';
import { noteFieldErrors, noteInputSchema, sanitizeNoteBody, sanitizeNoteText } from '@/lib/notes';
import { useThemePreference } from '@/providers/theme-provider';

type ItemFormModalProps = {
  visible: boolean;
  title: string;
  initialTitle?: string;
  initialBody?: string;
  onClose: () => void;
  onSubmit: (value: { title: string; body: string }) => Promise<void>;
};

export function ItemFormModal({
  visible,
  title,
  initialTitle = '',
  initialBody = '',
  onClose,
  onSubmit,
}: ItemFormModalProps) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <FormSheet
        key={`${initialTitle}:${initialBody}`}
        title={title}
        initialTitle={initialTitle}
        initialBody={initialBody}
        bottomInset={Math.max(insets.bottom, 16)}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </Modal>
  );
}

function FormSheet({
  title,
  initialTitle,
  initialBody,
  bottomInset,
  onClose,
  onSubmit,
}: {
  title: string;
  initialTitle: string;
  initialBody: string;
  bottomInset: number;
  onClose: () => void;
  onSubmit: (value: { title: string; body: string }) => Promise<void>;
}) {
  const { isDark } = useThemePreference();
  const [noteTitle, setNoteTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const parsed = noteInputSchema.safeParse({
      title: sanitizeNoteText(noteTitle),
      body: sanitizeNoteBody(body),
    });
    if (!parsed.success) {
      setErrors(noteFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch {
      setLoading(false);
    }
  }

  return (
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1 justify-end bg-slate-950/50">
            <MotiView
              from={{ translateY: 48, opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              transition={{ type: 'spring', damping: 18 }}
              style={{ paddingBottom: bottomInset }}
              className="max-h-[90%] rounded-t-3xl bg-slate-50 px-5 pt-4 dark:bg-slate-950">
              <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-slate-300 dark:bg-slate-700" />
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerClassName="gap-4 pb-4"
                showsVerticalScrollIndicator={false}>
                <Text className="text-2xl font-bold text-slate-900 dark:text-white">{title}</Text>
                <View className="gap-2">
                  <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">Title</Text>
                  <TextInput
                    value={noteTitle}
                    onChangeText={setNoteTitle}
                    autoCapitalize="sentences"
                    autoCorrect={false}
                    spellCheck={false}
                    placeholder="What is this note?"
                    placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                    className="h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  {errors.title ? <Text className="text-sm text-rose-600">{errors.title}</Text> : null}
                </View>
                <View className="gap-2">
                  <Text className="text-sm font-medium text-slate-700 dark:text-slate-200">Details</Text>
                  <TextInput
                    value={body}
                    onChangeText={setBody}
                    multiline
                    textAlignVertical="top"
                    autoCorrect={false}
                    spellCheck={false}
                    placeholder="Add the details"
                    placeholderTextColor={isDark ? '#94A3B8' : '#64748B'}
                    className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                  {errors.body ? <Text className="text-sm text-rose-600">{errors.body}</Text> : null}
                </View>
                <SubmitButton label="Save note" loading={loading} onPress={handleSubmit} />
                <Pressable accessibilityRole="button" onPress={onClose} className="items-center py-2">
                  <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">Cancel</Text>
                </Pressable>
              </ScrollView>
            </MotiView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
  );
}
