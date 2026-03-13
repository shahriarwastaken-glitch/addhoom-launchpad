import { useState, useMemo } from 'react';
import { Search, AlertTriangle, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  TEMPLATE_PROMPTS,
  TEMPLATE_CATEGORIES,
  BANGLISH_INSTRUCTION,
  fillTemplatePrompt,
  type TemplateCategory,
} from '@/constants/templatePrompts';
import { toast } from 'sonner';

const toBengali = (n: number) =>
  n.toString().replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[parseInt(d)]);

interface TemplatesBrowserProps {
  onSelectTemplate: (filledPrompt: string, aspectRatio: string) => void;
}

const TemplatesBrowser = ({ onSelectTemplate }: TemplatesBrowserProps) => {
  const { t, lang } = useLanguage();
  const { activeWorkspace } = useAuth();

  const defaultLang = activeWorkspace?.default_language || lang;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<TemplateCategory>>(new Set(['All']));
  const [templateLang, setTemplateLang] = useState<'en' | 'bn'>(defaultLang === 'bn' ? 'bn' : 'en');

  const hasDNA = !!(activeWorkspace?.image_generation_prompt_modifier || activeWorkspace?.shop_name);

  const toggleCategory = (cat: TemplateCategory) => {
    if (cat === 'All') {
      setSelectedCategories(new Set(['All']));
      return;
    }
    const next = new Set(selectedCategories);
    next.delete('All');
    if (next.has(cat)) {
      next.delete(cat);
      if (next.size === 0) next.add('All');
    } else {
      next.add(cat);
    }
    setSelectedCategories(next);
  };

  const filtered = useMemo(() => {
    return TEMPLATE_PROMPTS.filter((tp) => {
      // Category filter
      if (!selectedCategories.has('All')) {
        const match = tp.categories.some((c) => selectedCategories.has(c as TemplateCategory));
        if (!match) return false;
      }
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch =
          tp.name.toLowerCase().includes(q) ||
          tp.namebn.includes(q) ||
          tp.description.toLowerCase().includes(q) ||
          tp.descriptionbn.includes(q) ||
          tp.categories.some((c) => c.toLowerCase().includes(q));
        if (!nameMatch) return false;
      }
      return true;
    });
  }, [selectedCategories, searchQuery]);

  const handleUseTemplate = (tp: (typeof TEMPLATE_PROMPTS)[number]) => {
    let filled = fillTemplatePrompt(tp.prompt, activeWorkspace);

    if (templateLang === 'bn') {
      filled = filled + '\n\n' + BANGLISH_INSTRUCTION;
    }

    onSelectTemplate(filled, tp.aspectRatio);

    toast.success(
      templateLang === 'bn'
        ? 'টেমপ্লেট লোড হয়েছে। [BRACKETS] পূরণ করুন এবং জেনারেট করুন।'
        : 'Template loaded. Fill in the [BRACKETS] and generate.'
    );
  };

  return (
    <div className="space-y-4">
      {/* Shop DNA warning */}
      {!hasDNA && (
        <div className="flex items-start gap-2.5 rounded-xl border border-yellow-400/30 bg-yellow-50 dark:bg-yellow-950/20 px-3.5 py-3">
          <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
          <div className="text-[12px] font-heading-bn">
            <span className="text-yellow-800 dark:text-yellow-300">
              {t(
                'আপনার Shop DNA অসম্পূর্ণ। টেমপ্লেট প্লেসহোল্ডার ব্যবহার করবে।',
                'Your Shop DNA is incomplete. Templates will use placeholder values.'
              )}
            </span>{' '}
            <Link to="/dashboard/shop-dna" className="text-primary font-semibold hover:underline">
              {t('Shop DNA পূরণ করুন →', 'Complete Shop DNA →')}
            </Link>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('টেমপ্লেট খুঁজুন...', 'Search templates...')}
          className="w-full rounded-xl border-[1.5px] border-input bg-card pl-10 pr-4 py-2.5 text-[14px] font-heading-bn text-foreground outline-none transition-all duration-200 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]"
        />
      </div>

      {/* Category pills + Language toggle */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => toggleCategory(cat)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold font-heading-bn transition-all duration-150 active:scale-95 ${
              selectedCategories.has(cat)
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat === 'All' ? t('সব', 'All') : cat}
          </button>
        ))}
        <div className="ml-auto flex rounded-full border border-input overflow-hidden">
          {(['en', 'bn'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setTemplateLang(l)}
              className={`px-2.5 py-1 text-[11px] font-bold transition-colors ${
                templateLang === l
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              {l === 'en' ? 'EN' : 'বাংলা'}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
        {filtered.map((tp) => (
          <div
            key={tp.id}
            className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2 hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                {toBengali(tp.id).padStart(2, '0')}
              </span>
              <h4 className="text-[12px] font-bold font-heading-bn text-foreground leading-tight truncate">
                {templateLang === 'bn' ? tp.namebn : tp.name}
              </h4>
            </div>
            <p className="text-[10px] text-muted-foreground font-heading-bn leading-snug line-clamp-2 italic">
              {templateLang === 'bn' ? tp.descriptionbn : tp.description}
            </p>
            <div className="flex flex-wrap gap-1 mt-auto">
              {tp.categories.slice(0, 2).map((c) => (
                <span
                  key={c}
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-secondary text-muted-foreground"
                >
                  {c}
                </span>
              ))}
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-secondary text-muted-foreground">
                {tp.aspectRatio}
              </span>
            </div>
            <button
              onClick={() => handleUseTemplate(tp)}
              className="mt-1 w-full h-7 rounded-lg bg-primary/10 text-primary text-[11px] font-bold font-heading-bn flex items-center justify-center gap-1 hover:bg-primary/20 transition-colors active:scale-[0.97]"
            >
              {t('ব্যবহার করুন', 'Use Template')} <ArrowRight size={11} />
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground font-heading-bn py-8">
          {t('কোনো টেমপ্লেট পাওয়া যায়নি', 'No templates found')}
        </p>
      )}
    </div>
  );
};

export default TemplatesBrowser;
