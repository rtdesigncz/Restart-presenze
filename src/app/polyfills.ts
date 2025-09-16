// src/app/polyfills.ts

// Fetch API per Safari/iOS vecchi
import "whatwg-fetch";

// Promise/finally & EventTarget su iOS 12 sono ok, ma se notassi ancora problemi,
// possiamo aggiungere qui polyfill mirati (es. core-js) in un secondo step.