// sw.js — service worker mínimo, solo para cumplir el criterio de instalabilidad de
// algunos navegadores. A propósito NO intercepta fetch: esta app depende de datos en
// vivo (checklist, asistencia, inventario), así que cachear respuestas rompería la
// supervisión en tiempo real. No cachea nada, no sirve nada offline.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
