import { CancelablePromise, Resolve } from './types';

export const timeout = (ms: number): CancelablePromise => {
  let timerId: number;

  const promise = new Promise((resolve: Resolve) => {
    timerId = window.setTimeout(resolve, ms);
    return timerId;
  }) as CancelablePromise;

  promise.cancel = () => {
    clearTimeout(timerId);
  };

  return promise;
};
