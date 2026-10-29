import { useMemo } from 'react';
import { useApp } from './store';

/**
 * One source of truth for reading direction.
 *
 * Direction is derived from the chosen language rather than I18nManager, so switching
 * between Arabic and English flips the layout immediately with no app restart. Every
 * screen pulls the same values from here instead of re-deriving them, which is what
 * keeps alignment identical across the app — and identical to the website.
 */
export function useDir() {
  const { lang } = useApp();
  return useMemo(() => {
    const rtl = lang === 'ar';
    return {
      rtl,
      lang,
      row: rtl ? 'row-reverse' : 'row',
      rowRev: rtl ? 'row' : 'row-reverse',
      align: rtl ? 'right' : 'left',
      alignEnd: rtl ? 'left' : 'right',
      self: rtl ? 'flex-end' : 'flex-start',
      selfEnd: rtl ? 'flex-start' : 'flex-end',
      /* chevron that means "forward" in the reading direction */
      fwd: rtl ? 'chevron-back' : 'chevron-forward',
      back: rtl ? 'chevron-forward' : 'chevron-back',
    };
  }, [lang]);
}

export default useDir;
