// Work around a Node v20.20.0 typo in the bundled web streams code that
// Expo can hit while creating a fetch Response during startup.
Object.defineProperty(globalThis, 'undafined', {
  value: undefined,
  configurable: true,
});
