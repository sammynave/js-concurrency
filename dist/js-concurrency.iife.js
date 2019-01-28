var jsc = (function (exports) {
  'use strict';

  const task = (genFn) => {
    return {
      perform() {
        const gen = genFn();
        let n = gen.next();
        while(n.done === false) {
          n.next();
        }

        return n.value;
      }
    }
  };

  exports.task = task;

  return exports;

}({}));
//# sourceMappingURL=js-concurrency.iife.js.map
