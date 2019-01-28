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
}

export {
  task
}
