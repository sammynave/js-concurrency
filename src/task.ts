import { TaskInstance } from './task-instance';
import { TaskInstanceSubscriber, TaskSubscriber } from './types';

const IDLE = 'idle';
const RUNNING = 'running';

class Task {
  public genFn: Generator;
  public subscribers: TaskSubscriber[];
  public taskInstances: Set<TaskInstance>;
  public concurrency: number;
  public performCount: number;
  public droppedCount: number;
  public maxConcurrency: number;
  public state: 'idle' | 'running' | 'queued';
  public drop: boolean;

  constructor(genFn: Generator, { drop = true, maxConcurrency = 1 } = {}) {
    this.genFn = genFn;
    this.subscribers = [];
    this.taskInstances = new Set([]);
    // this can be a function of taskInstances now
    this.concurrency = 0;
    this.performCount = 0;
    this.droppedCount = 0;
    this.state = IDLE;
    this.drop = drop;
    this.maxConcurrency = maxConcurrency;
  }

  public subscribe(subscriber: TaskSubscriber) {
    this.subscribers.push(subscriber);

    subscriber({ state: 1 }, this);

    const unsubscribe = () => {
      const index = this.subscribers.indexOf(subscriber);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };

    return unsubscribe;
  }

  public cancelAll() {
    this.taskInstances.forEach(ti => {
      ti.cancel('cancelAll was called');
      this.taskInstances.delete(ti);
    });
  }

  public perform(subscribe: TaskInstanceSubscriber) {
    const taskInstance = new TaskInstance(this.genFn);
    taskInstance.subscribe(subscribe);
    taskInstance.run();
    this.taskInstances.add(taskInstance);

    if (this.concurrency >= this.maxConcurrency) {
      taskInstance.cancel('dropped');
    } else {
      this.performCount++;
      this.concurrency++;
    }

    /*
     * TODO: need to check if ANY instance `state`
     * is `running` or `queued`, not just the
     * most recent one
     */
    // @ts-ignore
    taskInstance.subscribe((changed, { state: tiState, cancelled }) => {
      if (changed.state) {
        this.state = IDLE;

        if (tiState === 'running') {
          this.state = RUNNING;
        }

        // TODO
        // if (tiState === 'queued') {
        //   this.state = QUEUED;
        // }

        if (tiState === 'finished') {
          this.concurrency--;
          this.taskInstances.delete(taskInstance);
        }

        if (tiState === 'dropped') {
          this.droppedCount++;
          this.taskInstances.delete(taskInstance);
        }

        if (tiState === 'canceled') {
          this.concurrency--;
          this.taskInstances.delete(taskInstance);
        }

        this.subscribers.forEach(s => s({ state: 1 }, this));
      }
    });

    return taskInstance;
  }
}

export { Task };
