export function canAccess(itemRoles?: string[] | null, userRoles: string[] = []) {
  if (!itemRoles || itemRoles.length === 0) return true; // public
  if (!userRoles || userRoles.length === 0) return false; // user has no roles
  return itemRoles.some(r => userRoles.includes(r));
}
