import type { CategoryFilter } from '@/types/video';
import { CATEGORIES } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/i18n';

interface CategoryChipsProps {
  selected: CategoryFilter;
  onSelect: (category: CategoryFilter) => void;
}

const FILTERS: CategoryFilter[] = ['All', ...CATEGORIES];
const CATEGORY_LABELS: Record<CategoryFilter, TranslationKey> = {
  All: 'category.all',
  Music: 'category.music',
  Coding: 'category.coding',
  Cooking: 'category.cooking',
  Sports: 'category.sports',
  Art: 'category.art',
  Nature: 'category.nature',
  Travel: 'category.travel',
};

export function CategoryChips({ selected, onSelect }: CategoryChipsProps) {
  const { t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('category.filter')}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {FILTERS.map((category) => {
        const isSelected = selected === category;
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            aria-pressed={isSelected}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              isSelected
                ? 'bg-neon-500 text-white shadow-[0_0_16px_-4px_rgba(176,38,255,0.9)]'
                : 'bg-surface-raised text-gray-300 hover:bg-surface-hover hover:text-white'
            }`}
          >
            {t(CATEGORY_LABELS[category])}
          </button>
        );
      })}
    </div>
  );
}
