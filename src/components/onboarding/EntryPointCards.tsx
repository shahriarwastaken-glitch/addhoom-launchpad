import { Globe, Camera, PenLine, LayoutTemplate } from 'lucide-react';

export type EntryPointType = 'website' | 'photos' | 'manual' | 'template';

const ENTRY_POINTS: { id: EntryPointType; icon: React.ElementType; title: string; description: string }[] = [
  {
    id: 'website', icon: Globe, title: 'Website URL',
    description: "We'll scan your site and extract everything automatically",
  },
  {
    id: 'photos', icon: Camera, title: 'Upload Product Photos',
    description: 'Upload photos of your products. AI will figure out your brand.',
  },
  {
    id: 'manual', icon: PenLine, title: 'Fill in Manually',
    description: 'Type your shop details yourself. Takes about 2 minutes.',
  },
  {
    id: 'template', icon: LayoutTemplate, title: 'Start from a Template',
    description: "Pick your industry. We'll pre-fill smart defaults.",
  },
];

type Props = {
  selected: EntryPointType | null;
  onSelect: (id: EntryPointType) => void;
};

const EntryPointCards = ({ selected, onSelect }: Props) => (
  <div className="grid grid-cols-2 gap-3">
    {ENTRY_POINTS.map(ep => {
      const Icon = ep.icon;
      const isSelected = selected === ep.id;
      return (
        <button
          key={ep.id}
          onClick={() => onSelect(ep.id)}
          className={`text-left p-5 rounded-2xl border-[1.5px] transition-all cursor-pointer hover:border-primary hover:shadow-[0_4px_16px_rgba(255,81,0,0.08)] ${
            isSelected
              ? 'border-primary bg-primary/[0.04]'
              : 'border-border bg-card'
          }`}
        >
          <Icon size={28} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
          <h3 className="text-base font-bold text-foreground mt-3 mb-1">{ep.title}</h3>
          <p className="text-[13px] text-muted-foreground leading-snug">{ep.description}</p>
        </button>
      );
    })}
  </div>
);

export default EntryPointCards;
