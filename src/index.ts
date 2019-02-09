import { Task } from './task';

export { timeout } from './timeout';

export const task = (genFn: Iterator<null>) => {
  return new Task(genFn);
};
