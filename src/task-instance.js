const RUNNING  = 'running';
const WAITING  = 'waiting';
const FINISHED = 'finished';
const CANCELED = 'canceled';
const DROPPED  = 'dropped';

export default class TaskInstance {
  constructor(genFn, { immediatelyCancel = false } = {}) {
    this._subscribers = [];
    this._state = RUNNING;
    this._isSuccessful = null;
    this._value = null;
    this._hasStarted = true;

    if (immediatelyCancel) {
      this.isDropped = true;
      return this;
    }

    const itr = genFn();

    /*
     * TODO: might not want to use recursion
     * benchmark this at some point
     */
    const run = (result) => {
      if (result.done) {
        this.isSuccessful = true;
        return Promise.resolve(result.value);
      }

      return Promise.resolve(result.value)
        .then(
          (res) => run(itr.next(res)),
          (err) => {
            this.error = err;
            itr.throw(this);
          }
        );
    }

    this.value = run(itr.next());
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

  get error() {
    return this._error;
  }

  set error(e) {
    this._isSuccessful = false;
    this._isFinished = true;
    this._error = e;
    this.emitChange(['state', 'error']);
  }

  /*
   * TODO:
   * probably want this to be a state machine and make sure
   * these are mutually exclusive.
   * microstates (https://github.com/microstates/microstates.js)
   * would be nice for this lib but it would quintuple the size
   */
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


  get isDropped() {
    return this._isDropped;
  }

  set isDropped(tf) {
    if (this._isDropped === tf) {
      return;
    }

    this._isDropped = tf;
    this.emitChange(['state']);
  }


  /*
   * TODO: these are not implemented yet
   */
  get isCanceling() {
    return this._isCanceling;
  }
}
