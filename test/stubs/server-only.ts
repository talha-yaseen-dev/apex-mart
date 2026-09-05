// Test stub: the real "server-only" package throws when imported outside a
// React Server Component. In unit tests we alias it to this no-op so modules
// guarded by `import "server-only"` (e.g. lib/tokens.ts) can be imported.
export {};
