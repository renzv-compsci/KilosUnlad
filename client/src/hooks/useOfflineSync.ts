import { useCallback, useEffect, useState } from 'react';
import type { FieldTaskSubmission } from '../types/contracts';
import axios from 'axios';
import { DraftIncompleteError, submitFieldTask } from '../services/api';
import { updateSubmissionStatus } from '../services/indexedDB';
import { readStoredSession } from '../services/authSession';

export function useOfflineSync(
  submissions: FieldTaskSubmission[],
  onSubmissionSynced: (taskId: string) => void,
  ownerId: string | null,
  enabled: boolean,
  onSubmissionRejected?: (taskId: string) => void,
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
        } catch (error) {
          // Network loss, 5xx, 401 (re-login) and 429 stay pending for the next attempt.
          // A client error the server will repeat (400/403/404/409/413/422) is kept on the
          // device as ERROR instead of being retried forever.
          const status = axios.isAxiosError(error) ? error.response?.status : undefined;
          const permanent = error instanceof DraftIncompleteError ||
            (status !== undefined && status >= 400 && status < 500 && ![401, 408, 429].includes(status));
          if (permanent) {
            await updateSubmissionStatus(ownerId, submission.task_id, 'ERROR');
            if (readStoredSession()?.user.user_id === ownerId) onSubmissionRejected?.(submission.task_id);
          }
        }
      }
      return syncedCount;
    } finally {
      setIsSyncing(false);
    }
  }, [enabled, ownerId, isSyncing, onSubmissionSynced, onSubmissionRejected, submissions]);

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
