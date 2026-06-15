// Global toast store (no React deps) so useToast can be called anywhere
const listeners = new Set();
let toasts = [];
let id = 0;

export function getToasts() { return toasts; }

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() { listeners.forEach((fn) => fn([...toasts])); }

export function addToast({ title, description, variant = 'default', duration = 4000 }) {
  const key = ++id;
  toasts = [...toasts, { id: key, title, description, variant, open: true }];
  emit();
  setTimeout(() => {
    toasts = toasts.map((t) => (t.id === key ? { ...t, open: false } : t));
    emit();
    setTimeout(() => { toasts = toasts.filter((t) => t.id !== key); emit(); }, 400);
  }, duration);
}
