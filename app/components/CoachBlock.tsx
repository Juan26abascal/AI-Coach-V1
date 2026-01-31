import AlertCard from './AlertCard';
import WorkoutCard from './WorkoutCard';
import ActionButtons from './ActionButtons';
import Card from '@/components/Card';
import type { CoachResponse } from '@/lib/coach/types';

type CoachBlockProps = {
  response: CoachResponse;
  onAction?: (value: string) => void;
};

export default function CoachBlock({ response, onAction }: CoachBlockProps) {
  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <p className="text-sm text-stone/80">{response.message}</p>
      </Card>

      {response.session && <WorkoutCard session={response.session} />}
      {response.alert && <AlertCard alert={response.alert} />}
      {response.actions && response.actions.length > 0 && (
        <Card className="space-y-3">
          <ActionButtons actions={response.actions} onAction={onAction} />
        </Card>
      )}
    </div>
  );
}
