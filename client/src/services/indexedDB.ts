import Dexie, { type Table } from 'dexie';
import type { FieldTaskItem, FieldTaskSubmission } from '../types/contracts';

type OwnedTask = FieldTaskItem & { owner_id: string };
type OwnedSubmission = FieldTaskSubmission & { owner_id: string };

class KilosUnladDatabase extends Dexie {
  ownedAssignedTasks!: Table<OwnedTask, [string, string]>;
  ownedSubmissions!: Table<OwnedSubmission, [string, string]>;

  constructor() {
    super('kilosunlad_field');
    this.version(1).stores({
      assignedTasks: 'task_id, household_id, status, due_date',
      pendingSubmissions: 'task_id, household_id, sync_status, timestamp',
    });
    // Preserve legacy drafts, but never attribute unowned demo data to a real user.
    this.version(2).stores({
      ownedAssignedTasks: '[owner_id+task_id], owner_id',
      ownedSubmissions: '[owner_id+task_id], owner_id',
    });
  }
}

export const fieldDatabase = new KilosUnladDatabase();

export async function cacheAssignedTasks(ownerId: string, tasks: FieldTaskItem[]): Promise<void> {
  await fieldDatabase.transaction('rw', fieldDatabase.ownedAssignedTasks, async () => {
    await fieldDatabase.ownedAssignedTasks.where('owner_id').equals(ownerId).delete();
    await fieldDatabase.ownedAssignedTasks.bulkPut(tasks.map((task) => ({ ...task, owner_id: ownerId })));
  });
}

export async function getCachedAssignedTasks(ownerId: string): Promise<FieldTaskItem[]> {
  const tasks = await fieldDatabase.ownedAssignedTasks.where('owner_id').equals(ownerId).toArray();
  return tasks.map(({ owner_id, ...task }) => task);
}

export async function queueSubmission(ownerId: string, submission: FieldTaskSubmission): Promise<void> {
  await fieldDatabase.ownedSubmissions.put({ ...submission, owner_id: ownerId });
}

export async function getQueuedSubmissions(ownerId: string): Promise<FieldTaskSubmission[]> {
  const submissions = await fieldDatabase.ownedSubmissions.where('owner_id').equals(ownerId).toArray();
  return submissions.map(({ owner_id, ...submission }) => submission)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export async function updateSubmissionStatus(
  ownerId: string,
  taskId: string,
  syncStatus: FieldTaskSubmission['sync_status'],
): Promise<void> {
  await fieldDatabase.ownedSubmissions.update([ownerId, taskId], { sync_status: syncStatus });
}
