import { createPortal } from 'react-dom';
import { useLayoutEffect, useState, type ReactNode } from 'react';

import { ensureDockHost } from '@/web/viewportLock';

/**
 * Lift the dock onto document.body so RN-web's transformed ancestors cannot
 * trap it inside a short box (the iPhone black chunk).
 */
export function DockPortal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    // Host must exist on the client canvas; creating it during render
    // hydrates into the RN tree and becomes the slab.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- portal mount
    setHost(ensureDockHost());
  }, []);

  if (!host) return null;
  return createPortal(children, host);
}
