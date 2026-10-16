import { create } from 'zustand';
import { S } from '../strings.ar';

export const useConfirm = create(() => ({ request: null }));

/**
 * Promise-based confirmation: `if (await confirm({ title, body, danger: true })) …`.
 * Replaces window.confirm with a themed, accessible Arabic dialog (rendered by <ConfirmHost/>).
 */
export function confirm({ title, body, confirmLabel = S.common.confirm, cancelLabel = S.common.cancel, danger = false }) {
  return new Promise((resolve) => {
    useConfirm.setState({ request: { title, body, confirmLabel, cancelLabel, danger, resolve } });
  });
}
