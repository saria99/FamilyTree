import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Dialogs render at the document root so they always cover the whole app (canvas, side panel, nav). */
export function Modal({ onDismiss, children }: { onDismiss: () => void; children: ReactNode }) {
  return createPortal(
    <div className="modal-backdrop" role="presentation" onClick={onDismiss}>
      {children}
    </div>,
    document.body,
  )
}
