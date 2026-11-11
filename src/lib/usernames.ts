export const usernamePattern = /^[a-z0-9][a-z0-9._-]{2,39}$/;

export function defaultUsername(email: string, name: string): string {
  const base = (email.split('@')[0] || name).toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
  return (base.length >= 3 ? base : `user.${base || 'staff'}`).slice(0, 32);
}

export async function reserveGeneratedUsername(base: string, reserve: (username: string) => Promise<void>): Promise<string> {
  for (let index = 1; index <= 1000; index++) {
    const username = index === 1 ? base : `${base}.${index}`;
    try {
      await reserve(username);
      return username;
    } catch (error) {
      if ((error as { code?: string })?.code !== 'IDENTIFIER_TAKEN') throw error;
    }
  }
  throw new Error('Unable to generate a unique username.');
}
