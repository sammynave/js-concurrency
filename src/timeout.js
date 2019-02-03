export const timeout = (ms) => {
  let timerId;

  let promise = new Promise((resolve) => {
    timerId = setTimeout(() => {
      resolve();
    }, ms);
  });

  promise.cancel = () => {
    clearTimeout(timerId);
  };

  return promise;
}
