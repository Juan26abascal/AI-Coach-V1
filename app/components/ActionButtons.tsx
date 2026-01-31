import Button from '@/components/Button';

type ActionButtonsProps = {
  actions: { label: string; value: string }[];
  onAction?: (value: string) => void;
};

export default function ActionButtons({ actions, onAction }: ActionButtonsProps) {
  const handleAction = (value: string) => {
    onAction?.(value);
  };

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button key={`${action.value}-${action.label}`} variant="secondary" onClick={() => handleAction(action.value)}>
          {action.label}
        </Button>
      ))}
    </div>
  );
}
