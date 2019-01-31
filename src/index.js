import { Task } from './task';

export const task = (...args) => {
  return new Task(...args);
}
