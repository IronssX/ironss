import type { CategoryFilter } from '@/types/video';
import { CATEGORIES } from '@/types/video';
import { useLanguage } from '@/hooks/useLanguage';
import type { TranslationKey } from '@/i18n';

interface CategoryChipsProps {
  selected: CategoryFilter;
  availableCategories: CategoryFilter[];
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

export function CategoryChips({ selected, availableCategories, onSelect }: CategoryChipsProps) {
  const { t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t('category.filter')}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {FILTERS.map((category) => {
        const isSelected = selected === category;
        const isAvailable = category === 'All' || availableCategories.includes(category);
        return (
          <button
            key={category}
            type="button"
            onClick={() => onSelect(category)}
            disabled={!isAvailable}
            aria-pressed={isSelected}
            aria-label={isAvailable ? t(CATEGORY_LABELS[category]) : t('category.unavailable', { category: t(CATEGORY_LABELS[category]) })}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              isSelected
                ? 'border border-neon-300/20 bg-neon-300 text-[#17111d] shadow-[0_5px_18px_-8px_rgba(214,176,255,.8)]'
                : 'border border-white/[0.07] bg-white/[0.025] text-gray-400 hover:border-white/15 hover:bg-white/[0.055] hover:text-white'
            } ${!isAvailable ? 'cursor-not-allowed opacity-35 hover:border-white/[0.07] hover:bg-white/[0.025] hover:text-gray-400' : ''}`}
            title={!isAvailable ? t('category.unavailable', { category: t(CATEGORY_LABELS[category]) }) : undefined}
          >
            {t(CATEGORY_LABELS[category])}
          </button>
        );
      })}
    </div>
  );
}
