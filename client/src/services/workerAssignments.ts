import axios from 'axios';
import { fetchAssignedTasks } from './api';
import { cacheAssignedTasks, getCachedAssignedTasks } from './indexedDB';
import { readStoredSession } from './authSession';

export async function loadWorkerAssignments(ownerId: string, online: boolean, signal: AbortSignal) {
  const session = readStoredSession();
  if (!session || session.user.role !== 'CASE_WORKER' || session.user.user_id !== ownerId) {
    throw new Error('Please sign in to this worker account before opening saved assignments.');
  }
  async function cached() {
    const tasks = await getCachedAssignedTasks(ownerId);
    return { tasks: tasks.map(task => ({ ...task, cached_offline: true })), source: 'device' as const, storageError: false };
  }
  if (!online) return cached();
  let tasks;
  try {
    tasks = await fetchAssignedTasks(signal);
  } catch (error) {
    // Never hide authentication, authorization or server failures behind cached data.
    if (!signal.aborted && axios.isAxiosError(error) && !error.response && error.code === 'ERR_NETWORK') return cached();
    throw error;
  }
  if (signal.aborted) throw new DOMException('Loading cancelled', 'AbortError');
  try {
    await cacheAssignedTasks(ownerId, tasks);
    return { tasks: tasks.map(task => ({ ...task, cached_offline: true })), source: 'server' as const, storageError: false };
  } catch {
    return { tasks, source: 'server' as const, storageError: true };
  }
}
