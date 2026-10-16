import { TriangleAlert } from 'lucide-react';
import { Button } from './Button';
import { useConfirm } from './confirm';
import { Dialog } from './Dialog';

export function ConfirmHost() {
  const request = useConfirm((state) => state.request);
  const close = (value) => {
    request?.resolve(value);
    useConfirm.setState({ request: null });
  };
  return (
    <Dialog
      open={Boolean(request)}
      onOpenChange={(open) => { if (!open) close(false); }}
      title={request?.title}
      description={request?.body}
      icon={request?.danger ? TriangleAlert : undefined}
      tone={request?.danger ? 'danger' : 'brand'}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={() => close(false)}>{request?.cancelLabel}</Button>
          <Button variant={request?.danger ? 'danger' : 'primary'} onClick={() => close(true)} autoFocus data-testid="confirm-accept">
            {request?.confirmLabel}
          </Button>
        </>
      )}
    />
  );
}
