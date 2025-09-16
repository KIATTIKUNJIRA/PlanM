// Temporary compatibility shim to suppress TS2306 "is not a module" error
// when using `import { createClient } from '@supabase/supabase-js'` under the
// current tsconfig (moduleResolution: bundler) in this monorepo environment.
// If proper typings resolve later, this file can be removed.
declare module '@supabase/supabase-js' {
  // We intentionally type as `any` to avoid blocking builds; refine if needed.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const createClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const SupabaseClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _default: any;
  export default _default;
}
