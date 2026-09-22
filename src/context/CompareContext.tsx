// CompareContext remembers which properties the user wants to compare.
//
// The user can tap "Add to Compare" from the Details screen while looking
// at different properties, one at a time. We need that list to still be
// there later when they open the Comparison screen -- so, just like
// AuthContext, we share it with the whole app using React Context.

import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';
import { Property } from '../types';

const MAX_COMPARE_ITEMS = 3;

interface CompareContextType {
  compareList: Property[];
  addToCompare: (property: Property) => void;
  removeFromCompare: (propertyId: string) => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

interface CompareProviderProps {
  children: React.ReactNode;
}

export function CompareProvider({ children }: CompareProviderProps) {
  const [compareList, setCompareList] = useState<Property[]>([]);

  function addToCompare(property: Property) {
    const alreadyAdded = compareList.some((item) => item.id === property.id);
    if (alreadyAdded) {
      Alert.alert('Already added', `"${property.title}" is already in your compare list.`);
      return;
    }

    if (compareList.length >= MAX_COMPARE_ITEMS) {
      Alert.alert(
        'Compare list is full',
        `You can only compare up to ${MAX_COMPARE_ITEMS} properties at a time. Remove one first.`
      );
      return;
    }

    setCompareList([...compareList, property]);
  }

  function removeFromCompare(propertyId: string) {
    setCompareList(compareList.filter((item) => item.id !== propertyId));
  }

  function clearCompare() {
    setCompareList([]);
  }

  const value: CompareContextType = {
    compareList,
    addToCompare,
    removeFromCompare,
    clearCompare,
  };

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextType {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare() must be called from inside a <CompareProvider>');
  }
  return context;
}
