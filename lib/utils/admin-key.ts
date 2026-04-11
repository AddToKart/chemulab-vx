const SECRET_KEY = 'god has been dead for a very long time';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export const ADMIN_KEY_HASH = simpleHash(SECRET_KEY);

export function verifyAdminKey(inputKey: string): boolean {
  return simpleHash(inputKey) === ADMIN_KEY_HASH;
}

export function getAdminHash(): string {
  return ADMIN_KEY_HASH;
}