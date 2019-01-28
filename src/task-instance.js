const RUNNING  = 'running';
const WAITING  = 'waiting';
const FINISHED = 'finished';
const CANCELED = 'canceled';
const DROPPED  = 'dropped';


export default class TaskInstance {
  constructor(genFn) {
    this._subscribers = [];
    this._state = RUNNING;
    this._isSuccessful = null;
    this._value = null;
    this._hasStarted = true;

    const itr = genFn();

    /*
     * TODO: might not want to use recursion
     * benchmark this at some point
     */
    const run = (arg) => {
      let result = itr.next(arg);

      /*
       * TODO: handle errors
       * https://www.promisejs.org/generators/#both
       */
      if (result.done) {
        this.isSuccessful = true;
        return result.value;
      } else {
        return Promise.resolve(result.value).then(run);
      }
    }

    this.value = run();

    return this;
  }

  emitChange(changedKeys) {
    const changed = {};
    changedKeys.forEach(c => changed[c] = 1);

    this._subscribers.forEach(s => s(changed, this));
  }

  subscribe(subscriber) {
    this._subscribers.push(subscriber);
    subscriber({ state: 1 }, this);

    const unsubscribe = function() {
      const index = subscribers.indexOf(subscriber);

      if (index !== -1) {
        subscribers.splice(index, 1);
      }

      /*
       * if we ever need any unsubscribe cleanup,
       * do it here here.
       */
    };

    return unsubscribe;
  }

  get state() {
    if (this.isDropped) {
      return DROPPED;
    } else if (this.isCanceling) {
      return CANCELED;
    } else if (this.isFinished) {
      return FINISHED;
    } else if (this.hasStarted) {
      return RUNNING;
    } else {
      return WAITING;
    }
  }


  get isFinished() {
    return this._isFinished;
  }


  get isSuccessful() {
    return this._isSuccessful;
  }

  set isSuccessful(tf) {
    this._isSuccessful = tf;
    this._isFinished = true;
    this.emitChange(['state']);
  }


  get hasStarted() {
    return this._hasStarted;
  }

  set hasStarted(tf) {
    if (this._hasStarted === tf) {
      return;
    }

    this._hasStarted = tf;
    this.emitChange(['state']);
  }


  get value() {
    return this._value;
  }

  set value(v) {
    this._value = v;
    this.emitChange(['value']);
  }



  /*
   * TODO: these are not implemented yet
   */
  get isDropped() {
    return this._isDropped;
  }

  get isCanceling() {
    return this._isCanceling;
  }
}
