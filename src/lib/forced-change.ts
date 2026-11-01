// Decisão pura do gate de troca obrigatória (testável sem Supabase).
// O bloqueio real é do banco (is_admin exige a flag desligada); aqui só
// refletimos o estado na navegação.

export const FORCED_CHANGE_PATH = '/trocar-senha';

export function forcedChangeRedirect(opts: {
  loggedIn: boolean;
  mustChange: boolean;
  pathname: string;
}): string | null {
  const { loggedIn, mustChange, pathname } = opts;
  if (!loggedIn) return null;
  if (mustChange && pathname !== FORCED_CHANGE_PATH) return FORCED_CHANGE_PATH;
  if (!mustChange && pathname === FORCED_CHANGE_PATH) return '/home';
  return null;
}
