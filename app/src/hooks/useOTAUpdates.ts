import { useEffect } from 'react';
import * as Updates from 'expo-updates';

// Checks for an OTA update on cold start and, if one is available, downloads and
// applies it (a brief reload). No-op in development / Expo Go, where updates are
// disabled — so it never interferes with local dev.
async function checkForOTAUpdate() {
  if (__DEV__ || !Updates.isEnabled) return;
  try {
    const result = await Updates.checkForUpdateAsync();
    if (result.isAvailable) {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    }
  } catch (e) {
    // Non-fatal — keep running on the current bundle
    console.log('[OTA] update check failed:', e);
  }
}

export function useOTAUpdates() {
  useEffect(() => {
    checkForOTAUpdate();
  }, []);
}
