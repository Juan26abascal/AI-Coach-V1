import type { SessionPrescription } from '@/lib/coach/schema';
import type { ReactNode } from 'react';

// Session type badge colors
const badgeStyles: Record<string, string> = {
  threshold: 'border border-amber-400 bg-amber-500/10 text-amber-300',
  tempo: 'border border-amber-400 bg-amber-500/10 text-amber-300',
  easy: 'border border-emerald-400 bg-emerald-500/10 text-emerald-200',
  long: 'border border-sky-400 bg-sky-500/10 text-sky-200',
  speed: 'border border-purple-400 bg-purple-500/10 text-purple-200',
  track: 'border border-purple-400 bg-purple-500/10 text-purple-200',
  recovery: 'border border-emerald-400 bg-emerald-500/10 text-emerald-200',
  race: 'border border-orange-400 bg-orange-500/10 text-orange-200',
};

// Helper to determine card type based on session structure
function getCardType(session: SessionPrescription): 'simple' | 'standard' | 'complex' {
  const hasStructure = session.warmup || session.main || session.cooldown;
  const hasDrills = session.warmup && 'drills' in session.warmup && session.warmup.drills?.length;
  const hasStretches = session.cooldown && 'stretches' in session.cooldown && session.cooldown.stretches?.length;

  if (hasDrills || hasStretches) return 'complex';
  if (hasStructure) return 'standard';
  return 'simple';
}

const Section = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="space-y-1">
    <p className="text-[10px] uppercase tracking-[0.3em] text-[#888]">{label}</p>
    <div className="text-sm leading-relaxed text-[#E8E4DE]">{children}</div>
  </div>
);

type WorkoutCardProps = {
  session: SessionPrescription;
};

/**
 * Simple Card: For easy/recovery runs - minimal structure
 */
function SimpleCard({ session }: WorkoutCardProps) {
  const badgeClass = badgeStyles[session.type] ?? 'border border-stone/40 text-stone';

  return (
    <div className="rounded-xl border border-[#333] bg-[#1E1E1E] p-4 text-[#E8E4DE] shadow-sm">
      <div className="space-y-2">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${badgeClass}`}>
          {session.type.replace(/^\w/, (char) => char.toUpperCase())}
        </span>
        <p className="text-lg font-semibold">{session.title}</p>
      </div>

      <div className="mt-4 space-y-3">
        {session.duration && (
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[#888]">Duration:</span>
            <span className="text-sm font-medium">{session.duration}</span>
          </div>
        )}
        {session.effort && (
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-[#888]">Effort:</span>
            <span className="text-sm font-medium">{session.effort}</span>
          </div>
        )}
        {session.notes && (
          <p className="text-sm text-[#888] italic">{session.notes}</p>
        )}
      </div>

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

/**
 * Standard Card: For threshold/tempo - full warmup → main → cooldown
 */
function StandardCard({ session }: WorkoutCardProps) {
  const badgeClass = badgeStyles[session.type] ?? 'border border-stone/40 text-stone';

  return (
    <div className="rounded-xl border border-[#333] bg-[#1E1E1E] p-4 text-[#E8E4DE] shadow-sm">
      <div className="space-y-2">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${badgeClass}`}>
          {session.type.replace(/^\w/, (char) => char.toUpperCase())}
        </span>
        <p className="text-lg font-semibold">{session.title}</p>
      </div>

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

/**
 * Complex Card: For speed/track/race - detailed with drills and stretches
 */
function ComplexCard({ session }: WorkoutCardProps) {
  const badgeClass = badgeStyles[session.type] ?? 'border border-stone/40 text-stone';
  const warmupDrills = session.warmup && 'drills' in session.warmup ? session.warmup.drills : undefined;
  const cooldownStretches = session.cooldown && 'stretches' in session.cooldown ? session.cooldown.stretches : undefined;

  return (
    <div className="rounded-xl border border-[#333] bg-[#1E1E1E] p-4 text-[#E8E4DE] shadow-sm">
      <div className="space-y-2">
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.3em] ${badgeClass}`}>
          {session.type.replace(/^\w/, (char) => char.toUpperCase())}
        </span>
        <p className="text-lg font-semibold">{session.title}</p>
      </div>

      <div className="mt-4 space-y-4">
        {session.warmup && (
          <Section label="Warm-up">
            <p className="text-sm text-[#E8E4DE]">
              <span className="font-semibold">Duration:</span> {session.warmup.duration}
            </p>
            <p className="text-sm text-[#888]">{session.warmup.description}</p>
            {warmupDrills && warmupDrills.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-semibold text-[#888]">Drills:</span>
                <ul className="mt-1 list-disc list-inside text-sm text-[#888]">
                  {warmupDrills.map((drill, idx) => (
                    <li key={idx}>{drill}</li>
                  ))}
                </ul>
              </div>
            )}
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
            {cooldownStretches && cooldownStretches.length > 0 && (
              <div className="mt-2">
                <span className="text-xs font-semibold text-[#888]">Stretches:</span>
                <ul className="mt-1 list-disc list-inside text-sm text-[#888]">
                  {cooldownStretches.map((stretch, idx) => (
                    <li key={idx}>{stretch}</li>
                  ))}
                </ul>
              </div>
            )}
          </Section>
        )}
      </div>

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

/**
 * Main WorkoutCard component - renders appropriate card type based on session structure
 */
export default function WorkoutCard({ session }: WorkoutCardProps) {
  const cardType = getCardType(session);

  switch (cardType) {
    case 'simple':
      return <SimpleCard session={session} />;
    case 'complex':
      return <ComplexCard session={session} />;
    case 'standard':
    default:
      return <StandardCard session={session} />;
  }
}
