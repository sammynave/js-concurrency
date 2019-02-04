// tslint:disable
export const timeout = (ms: number) => {
  // @ts-ignore
  let timerId;

  let promise = new Promise((resolve) => {
    timerId = setTimeout(resolve, ms);
  });

  // @ts-ignore
  promise.cancel = () => {
    // @ts-ignore
    clearTimeout(timerId);
  };

  return promise;
}
/* tslint:enable */
