import { useEffect } from 'react';
import { initClarity } from '../../lib/clarity';

/** Initializes Microsoft Clarity once on the client. */
export function ClarityInit() {
  useEffect(() => {
    initClarity();
  }, []);

  return null;
}
