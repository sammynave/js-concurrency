import { TaskInstance } from './task-instance';

const IDLE    = 'idle';
const RUNNING = 'running';
const QUEUED  = 'queued';

class Task {
  constructor(genFn, {
    drop = true,
    maxConcurrency = 1 } = {}) {

    this.genFn = genFn;
    this.subscribers = [];
    this.taskInstances = new Set([]);

    // this can be a funciton of taskInstances now
    this.concurrency = 0;

    this.performCount = 0;
    this.droppedCount = 0;
    this.state = IDLE;
    this.drop = drop;
    this.maxConcurrency = maxConcurrency;
  }


  subscribe(subscriber) {
    this.subscribers.push(subscriber);
    subscriber({ state: 1 }, this);

    const unsubscribe = function() {
      const index = this.subscribers.indexOf(subscriber);

      if (index !== -1) {
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
    this.taskInstances.forEach((ti) => {
      ti.cancel('cancelAll was called')
      this.taskInstances.delete(ti);
    });
  }

  perform(subscribe) {
    const taskInstance = new TaskInstance(this.genFn);  taskInstance.subscribe(subscribe);
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
    taskInstance.subscribe((changed, { state: tiState, cancelled }) => {
      if (changed.state) {
        this.state = IDLE;

        if (tiState === 'running') {
          this.state = RUNNING;
        }

        if (tiState === 'queued') {
          this.state = QUEUED;
        }

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

export {
  Task
}
