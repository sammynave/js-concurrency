const task = (genFn) => {
  return {
    perform() {
      const itr = genFn();

      /*
       * TODO: might not want to use recursion
       * benchmark this at some point
       */
      const run = (arg) => {
        let result = itr.next(arg);

        return result.done
          ? result.value
          : Promise.resolve(result.value).then(run);
      }

      return run();
    }
  }
}

export {
  task
}
