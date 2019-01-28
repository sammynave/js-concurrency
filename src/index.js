import TaskInstance from './task-instance';

const task = (genFn) => {
  return {
    perform() {
      return new TaskInstance(genFn);
    }
  }
}

export {
  task
}
