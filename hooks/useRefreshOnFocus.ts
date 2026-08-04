import React, { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Hook para refetch do React Query sempre que a tela entra em foco
 * (por exemplo, ao trocar de aba ou voltar de uma sub-tela de formulário).
 */
export function useRefreshOnFocus(refetch: () => void) {
  const firstTimeRef = useRef(true);

  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      refetch();
    }, [refetch])
  );
}
