import TaskInstance from './task-instance';

const IDLE    = 'idle';
const RUNNING = 'running';
const QUEUED  = 'queued';

const task = (genFn, { drop = true, maxConcurrency = 1 } = {}) => {
  let subscribers = [];
  return {
    concurrency: 0,
    performCount: 0,
    droppedCount: 0,
    state: IDLE,


    subscribe(subscriber) {
      subscribers.push(subscriber);
      subscriber({ state: 1 }, this);

      const unsubscribe = function() {
        const index = subscribers.indexOf(subscriber);

        if (index !== -1) {
          subscribers.splice(index, 1);
        }

        /*
         * if we ever need any unsubscribe cleanup,
         * do it here here.
         */
      };

      return unsubscribe;
    },



    perform() {
      let immediatelyCancel = false;
      if (this.concurrency >= maxConcurrency) {
        immediatelyCancel = true;
      } else {
        this.performCount++;
        this.concurrency++;
      }

      const taskInstance = new TaskInstance(genFn, { immediatelyCancel });

      /*
       * TODO: need to check if ANY instance `state`
       * is `running` or `queued`, not just the
       * most recent one
       */
      taskInstance.subscribe((changed, { state: tiState }) => {
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
          }

          if (tiState === 'dropped') {
            this.droppedCount++;
          }

          subscribers.forEach(s => s({ state: 1 }, this));
        }
      });

      return taskInstance;
    }
  }
}

export {
  task
}
