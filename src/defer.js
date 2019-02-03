export function defer(label) {
  let deferred = { resolve: undefined, reject: undefined };

  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
  }, label);

  return deferred;
}

