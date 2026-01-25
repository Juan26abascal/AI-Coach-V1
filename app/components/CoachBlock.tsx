import Card from '@/components/Card';

type CoachBlockProps = {
  title: string;
  bullets: string[];
  note?: string;
};

export default function CoachBlock({ title, bullets, note }: CoachBlockProps) {
  return (
    <Card className="space-y-3">
      <h4 className="text-sm font-semibold text-sand">{title}</h4>
      <ul className="space-y-2 text-sm text-stone/80">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-3">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sand/60" />
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
      {note && <p className="text-xs text-stone/60">{note}</p>}
    </Card>
  );
}
