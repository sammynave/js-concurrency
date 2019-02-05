import { Task } from './task';
import { TaskInstance } from './task-instance';

export type Reject = (reason?: Error) => Error | void;

export type Resolve = (value: any) => any;

export interface Deferred {
  promise: Promise<(resolve: Resolve, reject: Reject) => null>;
  resolve: Resolve;
  reject: Reject;
}

export interface CancelablePromise extends Promise<any> {
  cancel(): void;
}

export interface Changed {
  [key: string]: 0 | 1;
}

export type TaskInstanceSubscriber = (
  changed: Changed,
  taskInstance: TaskInstance
) => void;

export type TaskSubscriber = (changed: Changed, task: Task) => void;
