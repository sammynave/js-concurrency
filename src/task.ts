// tslint:disable
// @ts-ignore
import { TaskInstance } from './task-instance';

const IDLE    = 'idle';
const RUNNING = 'running';
const QUEUED  = 'queued';

class Task {
  // @ts-ignore
  constructor(genFn, {
    drop = true,
    maxConcurrency = 1 } = {}) {

    // @ts-ignore
    this.genFn = genFn;

    // @ts-ignore
    this.subscribers = [];

    // @ts-ignore
    this.taskInstances = new Set([]);

    // this can be a funciton of taskInstances now
    // @ts-ignore
    this.concurrency = 0;

    // @ts-ignore
    this.performCount = 0;

    // @ts-ignore
    this.droppedCount = 0;

    // @ts-ignore
    this.state = IDLE;

    // @ts-ignore
    this.drop = drop;

    // @ts-ignore
    this.maxConcurrency = maxConcurrency;
  }


  // @ts-ignore
  subscribe(subscriber) {
    // @ts-ignore
    this.subscribers.push(subscriber);
    subscriber({ state: 1 }, this);

    const unsubscribe = function() {
      // @ts-ignore
      const index = this.subscribers.indexOf(subscriber);

      if (index !== -1) {
        // @ts-ignore
        this.subscribers.splice(index, 1);
      }

      /*
       * if we ever need any unsubscribe cleanup,
       * do it here here.
       */
    };

    return unsubscribe;
  }


  cancelAll() {
    // @ts-ignore
    this.taskInstances.forEach((ti) => {
      ti.cancel('cancelAll was called')
      // @ts-ignore
      this.taskInstances.delete(ti);
    });
  }

  // @ts-ignore
  perform(subscribe) {
    // @ts-ignore
    const taskInstance = new TaskInstance(this.genFn);  taskInstance.subscribe(subscribe);
    // @ts-ignore
    taskInstance.run();
    // @ts-ignore
    this.taskInstances.add(taskInstance);

    // @ts-ignore
    if (this.concurrency >= this.maxConcurrency) {
      taskInstance.cancel('dropped');
    } else {
      // @ts-ignore
      this.performCount++;
      // @ts-ignore
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
        // @ts-ignore
        this.state = IDLE;

        if (tiState === 'running') {
          // @ts-ignore
          this.state = RUNNING;
        }

        if (tiState === 'queued') {
          // @ts-ignore
          this.state = QUEUED;
        }

        if (tiState === 'finished') {
          // @ts-ignore
          this.concurrency--;
          // @ts-ignore
          this.taskInstances.delete(taskInstance);
        }

        if (tiState === 'dropped') {
          // @ts-ignore
          this.droppedCount++;
          // @ts-ignore
          this.taskInstances.delete(taskInstance);
        }

        if (tiState === 'canceled') {
          // @ts-ignore
          this.concurrency--;
          // @ts-ignore
          this.taskInstances.delete(taskInstance);
        }

        // @ts-ignore
        this.subscribers.forEach(s => s({ state: 1 }, this));
      }
    });

    return taskInstance;
  }
}

export {
  Task
}
// tslint:enable
