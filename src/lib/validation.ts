import { z } from 'zod';

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/** Strip control characters and normalize unicode before any auth request. */
export function sanitizeEmail(value: string) {
  return value.normalize('NFKC').replace(CONTROL_CHARS, '').trim().toLowerCase();
}

/** Passwords keep intentional spaces, but control characters are removed. */
export function sanitizePassword(value: string) {
  return value.normalize('NFKC').replace(CONTROL_CHARS, '');
}

const emailSchema = z
  .string()
  .min(3, 'Enter your email address.')
  .max(254, 'Email is too long.')
  .refine((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Enter a valid email address.');

export const passwordRules = [
  { id: 'length', label: '12+ characters', test: (value: string) => value.length >= 12 },
  { id: 'lower', label: 'Lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'upper', label: 'Uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'digit', label: 'Number', test: (value: string) => /\d/.test(value) },
  { id: 'symbol', label: 'Symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
] as const;

export function passwordStrength(value: string) {
  const passed = passwordRules.filter((rule) => rule.test(value)).length;
  const ratio = passed / passwordRules.length;
  const label = ratio === 0 ? 'Empty' : ratio < 0.6 ? 'Weak' : ratio < 1 ? 'Fair' : 'Strong';
  return { passed, ratio, label };
}

const strongPasswordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .refine((value) => /[a-z]/.test(value), 'Include a lowercase letter.')
  .refine((value) => /[A-Z]/.test(value), 'Include an uppercase letter.')
  .refine((value) => /\d/.test(value), 'Include a number.')
  .refine((value) => /[^A-Za-z0-9]/.test(value), 'Include a symbol.');

export const recoveryEmailSchema = z.object({
  email: emailSchema,
});

export const recoveryCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Enter the 6-digit code from your email.');

export const newPasswordSchema = z
  .object({
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(128, 'Password must be 128 characters or fewer.'),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: strongPasswordSchema,
    confirmPassword: z.string().min(1, 'Confirm your password.'),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export function fieldErrors(error: z.ZodError) {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
