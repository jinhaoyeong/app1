import type { ReactNode } from 'react';

/** Native: the overlay already sits on the screen. Web uses DockPortal.web.tsx. */
export function DockPortal({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
