import { mutate } from 'swr';

// Invalidate all project-related caches after a create/update/delete.
export async function afterProjectChange(orgId: string) {
  await Promise.all([
    mutate(['recent-projects', orgId]),
    mutate(['project-type-counts', orgId]),
    mutate(['project-count', orgId]),
  ]);
}
