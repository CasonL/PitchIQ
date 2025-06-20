import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// New scroll utility function
export const scrollToElement = (
  target: string | React.RefObject<HTMLElement>,
  offsetMobile: number = 80,
  offsetDesktop: number = 100
) => {
  let element: HTMLElement | null = null;

  if (typeof target === 'string') {
    element = document.getElementById(target);
  } else if (target && target.current) {
    element = target.current;
  }

  if (element) {
    const currentScrollY = window.pageYOffset || document.documentElement.scrollTop;
    const elementRect = element.getBoundingClientRect();
    const elementTop = elementRect.top + currentScrollY;

    const isMobile = window.innerWidth < 768;
    const offset = isMobile ? offsetMobile : offsetDesktop;
    const targetScrollY = elementTop - offset;
    const finalScrollY = Math.max(0, targetScrollY);

    window.scrollTo({
      top: finalScrollY,
      behavior: 'smooth',
    });

    // Optional: Dispatch a highlight event or handle highlighting directly
    // For now, let's keep it simple and remove the direct event dispatch from here.
    // The component that owns the target element can handle highlighting if needed.
    // setTimeout(() => {
    //   window.dispatchEvent(new CustomEvent('highlightEmailSignup'));
    // }, 800);
  } else {
    console.warn('Scroll target not found:', target);
  }
};
