const RUNNING  = 'running';
const WAITING  = 'waiting';
const FINISHED = 'finished';
const CANCELED = 'canceled';
const DROPPED  = 'dropped';


export default class TaskInstance {
  constructor(genFn) {
    this._subscribers = [];
    this._hasStarted = true;
    this._state = RUNNING;

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

  emitChange() {
    this._subscribers.forEach(s => s(this));
  }

  subscribe(subscriber) {
    this._subscribers.push(subscriber);
    subscriber(this);

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
    this.emitChange();
  }


  get hasStarted() {
    return this._hasStarted;
  }

  set hasStarted(tf) {
    this._hasStarted = tf;
    this.emitChange();
  }


  get value() {
    return this._value;
  }

  set value(v) {
    this._value = v;
    this.emitChange();
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
