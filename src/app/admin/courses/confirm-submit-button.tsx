'use client';
import { Button } from '@/components/ui/button';

// Submit-кнопка с window.confirm — отменяет отправку формы при отказе
export function ConfirmSubmitButton({
  message = 'Удалить?',
  ...props
}: React.ComponentProps<typeof Button> & { message?: string }) {
  return (
    <Button
      type="submit"
      {...props}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    />
  );
}
