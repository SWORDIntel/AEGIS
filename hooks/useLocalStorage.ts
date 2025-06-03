
import { useState, useEffect, useCallback } from 'react';

// Type for the hook's return value
type SetValue<T> = (value: T | ((val: T) => T)) => void;
type RemoveValue = () => void;

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, SetValue<T>, RemoveValue] { // Updated return tuple
  
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [initialValue, key]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue: SetValue<T> = useCallback(
    (value) => {
      if (typeof window === 'undefined') {
        console.warn(
          `Tried setting localStorage key “${key}” even though environment is not a client`
        );
      }
      try {
        const newValue = value instanceof Function ? value(storedValue) : value;
        window.localStorage.setItem(key, JSON.stringify(newValue));
        setStoredValue(newValue);
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue: RemoveValue = useCallback(() => {
    if (typeof window === 'undefined') {
      console.warn(
        `Tried removing localStorage key “${key}” even though environment is not a client`
      );
      return;
    }
    try {
      window.localStorage.removeItem(key);
      // Reset state to initialValue, or handle as appropriate for your app
      // (e.g., if T can be undefined, you might set it to undefined)
      setStoredValue(initialValue); 
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]); // Depend on readValue, which depends on key and initialValue

  return [storedValue, setValue, removeValue];
}
