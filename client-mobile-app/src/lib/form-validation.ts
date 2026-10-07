/**
 * Local sign-in and sign-up form styles.
 *
 * Shared by the Log in and Create account screens so both forms look and behave
 * identically. Validation is duplicated per field rather than run on submit,
 * because a native form should say what is wrong while the user is still typing
 * in that field.
 *
 * Rules mirror the backend's zod schema exactly — email format, username >= 3,
 * password >= 6, phone 10–15 digits — so a user is never told a form is fine and
 * then rejected with a 400.
 */

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors = Partial<Record<string, string>>;

/** The same constraints the backend enforces, checked before submitting. */
export function validateSignup(values: {
  fullname: string;
  username: string;
  email: string;
  phonenumber: string;
  password: string;
  confirmPassword: string;
}): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.fullname.trim()) errors.fullname = "Enter your full name.";
  if (values.username.trim().length < 3) {
    errors.username = "Username must be at least 3 characters.";
  }
  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  const digits = values.phonenumber.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    errors.phonenumber = "Phone number must be 10 to 15 digits.";
  }

  if (values.password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  if (values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export function validateSignin(values: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};

  if (!EMAIL_PATTERN.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  // The backend only enforces the minimum length, not a wrong-value case, so an
  // empty password is caught here to save a pointless round trip.
  if (!values.password) errors.password = "Enter your password.";

  return errors;
}

export const hasErrors = (errors: FieldErrors): boolean =>
  Object.keys(errors).length > 0;

/** Keeps only the backend's messages for fields the form actually shows. */
export function mapServerFieldErrors(
  fieldErrors: { field: string; message: string }[] | undefined,
  allowed: string[],
): FieldErrors {
  if (!Array.isArray(fieldErrors)) return {};

  const result: FieldErrors = {};
  for (const entry of fieldErrors) {
    if (entry && allowed.includes(entry.field)) {
      result[entry.field] = entry.message;
    }
  }
  return result;
}