import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface AccessibleDialogProps {
  titleId: string;
  onClose: () => void;
  className: string;
  children: React.ReactNode;
  busy?: boolean;
}

export function AccessibleDialog({ titleId, onClose, className, children, busy = false }: AccessibleDialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const siblings = Array.from(document.body.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && !node.contains(dialog),
    ).map((node) => ({ node, inert: node.inert }));
    dialog.focus();
    siblings.forEach(({ node }) => { node.inert = true; });
    document.body.style.overflow = 'hidden';

    const getControls = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button, a[href], input, select, textarea, summary, [tabindex]',
    )).filter((node) => !node.matches(':disabled, [hidden], [inert], input[type="hidden"]') && node.tabIndex >= 0 && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== 'hidden');
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!busyRef.current) closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const controls = getControls();
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); dialog.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault(); first.focus();
      }
    };
    dialog.addEventListener('keydown', handleKey);
    return () => {
      dialog.removeEventListener('keydown', handleKey);
      siblings.forEach(({ node, inert }) => { node.inert = inert; });
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className={className}>{children}</div>,
    document.body,
  );
}
