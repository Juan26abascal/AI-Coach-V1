import type { Session } from '@/lib/coach/schema';
import type { ReactNode } from 'react';

// Use Session type (which is the same as SessionPrescription)
type SessionPrescription = Session;

const badgeStyles: Record<SessionPrescription['type'], string> = {
  threshold: 'border border-amber-400 bg-amber-500/10 text-amber-300',
  tempo: 'border border-amber-400 bg-amber-500/10 text-amber-300',
  easy: 'border border-emerald-400 bg-emerald-500/10 text-emerald-200',
  long: 'border border-sky-400 bg-sky-500/10 text-sky-200',
  speed: 'border border-purple-400 bg-purple-500/10 text-purple-200',
  track: 'border border-purple-400 bg-purple-500/10 text-purple-200',
  recovery: 'border border-emerald-400 bg-emerald-500/10 text-emerald-200',
  race: 'border border-orange-400 bg-orange-500/10 text-orange-200',
};

const Section = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">{label}</p>
    <div className="text-sm leading-relaxed text-[#E8E4DE]">{children}</div>
  </div>
);

type WorkoutCardProps = {
  session: SessionPrescription;
};

export default function WorkoutCard({ session }: WorkoutCardProps) {
  const badgeClass = badgeStyles[session.type] ?? 'border border-stone/40 text-stone';

  // Check if this is a simple workout (no warmup/main/cooldown)
  const isSimpleWorkout = !session.warmup && !session.main && !session.cooldown;

  return (
    <div className="rounded-xl border border-[#333] bg-[#1E1E1E] p-4 text-[#E8E4DE] shadow-sm">
      <div className="space-y-2">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${badgeClass}`}>
          {session.type.replace(/^\w/, (char: string) => char.toUpperCase())}
        </span>
        <p className="text-lg font-semibold">{session.title}</p>
      </div>

      {isSimpleWorkout ? (
        // Simple workout display (easy runs, recovery)
        <div className="mt-4 space-y-2">
          {session.duration && (
            <p className="text-sm text-[#E8E4DE]">
              <span className="font-semibold">Duration:</span> {session.duration}
            </p>
          )}
          {session.effort && (
            <p className="text-sm text-[#E8E4DE]">
              <span className="font-semibold">Effort:</span> {session.effort}
            </p>
          )}
          {session.notes && (
            <p className="text-sm text-[#888]">{session.notes}</p>
          )}
        </div>
      ) : (
        // Structured workout display
        <div className="mt-4 space-y-4">
          {session.warmup && (
            <Section label="Warm-up">
              <p className="text-sm text-[#E8E4DE]">
                <span className="font-semibold">Duration:</span> {session.warmup.duration}
              </p>
              <p className="text-sm text-[#888]">{session.warmup.description}</p>
            </Section>
          )}

          {session.main && (
            <Section label="Main">
              <p className="text-sm text-[#E8E4DE]">
                <span className="block font-semibold">Structure:</span> {session.main.structure}
              </p>
              <p className="text-sm text-[#E8E4DE]">
                <span className="block font-semibold">Target:</span> {session.main.target}
              </p>
              {session.main.recovery && (
                <p className="text-sm text-[#E8E4DE]">
                  <span className="block font-semibold">Recovery:</span> {session.main.recovery}
                </p>
              )}
              {session.main.notes && (
                <p className="text-sm text-[#888]">{session.main.notes}</p>
              )}
            </Section>
          )}

          {session.cooldown && (
            <Section label="Cooldown">
              <p className="text-sm text-[#E8E4DE]">
                <span className="block font-semibold">Duration:</span> {session.cooldown.duration}
              </p>
              <p className="text-sm text-[#888]">{session.cooldown.description}</p>
            </Section>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold text-[#888]">
        <span>Total time: {session.totalTime}</span>
        {session.totalDistance && <span>Total distance: {session.totalDistance}</span>}
      </div>

      {session.calibration && (
        <p className="mt-2 text-xs text-[#888]">{session.calibration}</p>
      )}
    </div>
  );
}