// tslint:disable
// @ts-ignore
export function defer() {
  let deferred = { resolve: undefined, reject: undefined };

  // @ts-ignore
  deferred.promise = new Promise((resolve, reject) => {
    // @ts-ignore
    deferred.resolve = resolve;
    // @ts-ignore
    deferred.reject = reject;
  });

  return deferred;
}
// tslint:enable
