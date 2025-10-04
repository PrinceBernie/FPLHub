import React from 'react';

/**
 * Debounce utility for optimizing API calls
 * Prevents excessive API requests by delaying execution until after a specified delay
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle utility for limiting API calls to a maximum frequency
 * Ensures function is called at most once per specified interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Custom hook for debounced search
 * Returns a debounced search function and current search value
 */
export function useDebouncedSearch(
  searchFunction: (query: string) => void,
  delay: number = 300
) {
  const [searchValue, setSearchValue] = React.useState('');
  
  const debouncedSearch = React.useMemo(
    () => debounce(searchFunction, delay),
    [searchFunction, delay]
  );
  
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    debouncedSearch(value);
  };
  
  return {
    searchValue,
    handleSearchChange,
    clearSearch: () => {
      setSearchValue('');
      searchFunction('');
    }
  };
}
