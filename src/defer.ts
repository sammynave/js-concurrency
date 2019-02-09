import { Deferred, Reject, Resolve } from './types';

export function defer(): Deferred {
  const deferred: any = {};

  deferred.promise = new Promise((resolve: Resolve, reject: Reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  });

  return deferred;
}
