const USERNAME_MIN = 3;
const USERNAME_MAX = 20;
const USERNAME_REGEX = /^[A-Za-z0-9_-]+$/;

export function validateUsername(raw: string): { value: string; error: string | null } {
  const value = raw.trim();
  if (value.length < USERNAME_MIN) {
    return { value, error: `pseudo trop court (${USERNAME_MIN} caractères min)` };
  }
  if (value.length > USERNAME_MAX) {
    return { value, error: `pseudo trop long (${USERNAME_MAX} caractères max)` };
  }
  if (!USERNAME_REGEX.test(value)) {
    return { value, error: "lettres, chiffres, tiret et underscore uniquement (pas d'espace, accent ni emoji)" };
  }
  return { value, error: null };
}
