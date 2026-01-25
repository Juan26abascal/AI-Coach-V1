import clsx from 'clsx';
import Card from '@/components/Card';
import type { PlanDay } from '@/types';

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type WeekGridProps = {
  week: PlanDay[];
  selectedDay: number;
  onSelect: (index: number) => void;
};

export default function WeekGrid({ week, selectedDay, onSelect }: WeekGridProps) {
  const todayIndex = new Date().getDay();
  const normalizedToday = todayIndex === 0 ? 6 : todayIndex - 1;

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day, index) => {
        const session = week[index];
        const isToday = normalizedToday === index;
        const isSelected = selectedDay === index;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onSelect(index)}
            className={clsx('focus-ring text-left')}
          >
            <Card
              className={clsx(
                'h-full space-y-3 border transition',
                isSelected && 'border-sand/60',
                isToday && 'bg-smoke/70'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.2em] text-stone/60">{day}</span>
                {isToday && <span className="text-[10px] uppercase text-sand">Today</span>}
              </div>
              <p className="text-sm text-stone">
                {session?.title ?? 'Rest / No plan'}
              </p>
              <p className="text-xs text-stone/50">
                {session?.details ?? 'Coach will refine this day.'}
              </p>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
