import { Task } from './task';

export { timeout } from './timeout';

export const task = (...args) => {
  return new Task(...args);
}
