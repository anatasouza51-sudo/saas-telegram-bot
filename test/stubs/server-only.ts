// The real "server-only" package throws on import outside a React Server
// Component graph. Tests exercise server modules directly, so it is aliased
// to this no-op stub in vitest.config.ts.
export {}
