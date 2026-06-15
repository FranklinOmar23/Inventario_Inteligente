import { useEffect, useState } from 'react';
import { addToast, subscribe, getToasts } from './toast-store';

export function useToast() {
  return { toast: addToast };
}

export function useToasts() {
  const [toasts, setToasts] = useState(getToasts);
  useEffect(() => subscribe(setToasts), []);
  return toasts;
}
