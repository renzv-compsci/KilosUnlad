import { useCallback, useEffect, useState } from 'react';
import type { FieldTaskSubmission } from '../types/contracts';
import { submitFieldTask } from '../services/api';
import { updateSubmissionStatus } from '../services/indexedDB';
import { readStoredSession } from '../services/authSession';

export function useOfflineSync(
  submissions: FieldTaskSubmission[],
  onSubmissionSynced: (taskId: string) => void,
  ownerId: string | null,
  enabled: boolean,
) {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncPending = useCallback(async () => {
    const pending = submissions.filter((item) => item.sync_status === 'PENDING_SYNC');
    if (!enabled || !ownerId || !navigator.onLine || pending.length === 0 || isSyncing) return 0;

    setIsSyncing(true);
    let syncedCount = 0;
    try {
      for (const submission of pending) {
        if (readStoredSession()?.user.user_id !== ownerId) break;
        try {
          await submitFieldTask(submission);
          await updateSubmissionStatus(ownerId, submission.task_id, 'SYNCED');
          if (readStoredSession()?.user.user_id === ownerId) onSubmissionSynced(submission.task_id);
          syncedCount += 1;
        } catch {
          // Keep the report pending until the backend endpoint is available.
        }
      }
      return syncedCount;
    } finally {
      setIsSyncing(false);
    }
  }, [enabled, ownerId, isSyncing, onSubmissionSynced, submissions]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && enabled) void syncPending();
  }, [isOnline, enabled, ownerId, submissions.length]);

  return { isOnline, isSyncing, syncPending };
}
