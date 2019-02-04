// tslint:disable
// @ts-ignore
import { defer } from './defer';
// @ts-ignore
import { timeout } from './timeout';

const RUNNING  = 'running';
const WAITING  = 'waiting';
const FINISHED = 'finished';
const CANCELED = 'canceled';
const DROPPED  = 'dropped';

// @ts-ignore
const YIELDABLE_CANCEL = 'cancel';

class TaskInstance {
  // @ts-ignore
  constructor(genFn) {
    // @ts-ignore
    this._subscribers = [];

    // @ts-ignore
    this._state = RUNNING;

    // @ts-ignore
    this._isSuccessful = null;

    // @ts-ignore
    this._value = null;

    // @ts-ignore
    this._hasStarted = true;

    // @ts-ignore
    this._isCanceling = false;

    // @ts-ignore
    this._cancelReason = null;

    // @ts-ignore
    this.itrResult = null;

    // @ts-ignore
    this.itr = genFn();

    // @ts-ignore
    this.run = (res) => {
      /*
       * `result` { value: Promise | T, value: bool }
       */
      // @ts-ignore
      this.itrResult = this.itr.next(res);


      // @ts-ignore
      if (this.itrResult.done) {
        // @ts-ignore
        this.value = this.itrResult.value;
        this.isSuccessful = true;
        // @ts-ignore
        return Promise.resolve(this.itrResult.value);
      }

      // @ts-ignore
      this.deferred = defer();

      // @ts-ignore
      this.deferred.promise.then(
        // @ts-ignore
        (res) => {
          if (this.isCanceled) { return; };

          // @ts-ignore
          return this.run(res);
        },

        // @ts-ignore
        (err) => {
          this.error = err;
          // @ts-ignore
          return this.itr.throw(this);
        }
      );

      // @ts-ignore
      this.deferred.resolve(this.itrResult.value);

      // @ts-ignore
      return this.deferred;
    }

    return this;
  }

  // @ts-ignore
  emitChange(changedKeys) {
    const changed = {};
    // @ts-ignore
    changedKeys.forEach(c => changed[c] = 1);
    // @ts-ignore
    this._subscribers.forEach(s => {
      s(changed, this)
    });
  }

  cancel(cancelReason = 'TODO add a reason for cancellation') {
    if (this.isCanceling || this.isFinished) { return; }

    /*
     * Batch changes by using _<prop>
     */

    if (cancelReason === DROPPED) {
      // @ts-ignore
      this._isDropped = true;
    }

    // @ts-ignore
    this._isCanceling = true;

    /*
     * TODO: get actual reasons
     */
    // @ts-ignore
    this._cancelReason = cancelReason;
    // @ts-ignore
    this._isFinished = true;
    // @ts-ignore
    this._value = Error(this.cancelReason);

    /*
     * If this is cancel aware promise (e.g. `timeout`), then
     * cancel and clean that up
     */
    // @ts-ignore
    if (typeof this.itrResult.value.cancel === 'function') {
      // @ts-ignore
      this.itrResult.value.cancel();
    }

    // @ts-ignore
    this.deferred.reject(this.itr.throw(this));
    this.emitChange(['state', 'value', 'cancelReason']);
  }

  // @ts-ignore
  subscribe(subscriber) {
    // @ts-ignore
    this._subscribers.push(subscriber);
    subscriber({ state: 1 }, this);

    const unsubscribe = function() {
      // @ts-ignore
      const index = subscribers.indexOf(subscriber);

      if (index !== -1) {
        // @ts-ignore
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
    // @ts-ignore
    return this._error;
  }

  set error(e) {
    // @ts-ignore
    this._isSuccessful = false;
    // @ts-ignore
    this._isFinished = true;
    // @ts-ignore
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
    // @ts-ignore
    return this._isFinished;
  }


  get isSuccessful() {
    // @ts-ignore
    return this._isSuccessful;
  }

  set isSuccessful(tf) {
    // @ts-ignore
    this._isSuccessful = tf;
    // @ts-ignore
    this._isFinished = true;
    this.emitChange(['state', 'value']);
  }


  get hasStarted() {
    // @ts-ignore
    return this._hasStarted;
  }

  set hasStarted(tf) {
    // @ts-ignore
    if (this._hasStarted === tf) {
      return;
    }

    // @ts-ignore
    this._hasStarted = tf;
    this.emitChange(['state']);
  }


  get value() {
    // @ts-ignore
    return this._value;
  }

  set value(v) {
    // @ts-ignore
    this._value = v;
    this.emitChange(['value']);
  }


  get isDropped() {
    // @ts-ignore
    return this._isDropped;
  }

  set isDropped(tf) {
    // @ts-ignore
    if (this._isDropped === tf) {
      return;
    }

    // @ts-ignore
    this._isDropped = tf;
    this.emitChange(['state']);
  }

  get isRunning() {
    return !this.isFinished;
  }

  get isCanceled() {
    return this.isCanceling && this.isFinished;
  }

  get isCanceling() {
    // @ts-ignore
    return this._isCanceling;
  }

  set isCanceling(tf) {
    // @ts-ignore
    this._isCanceling = tf;
    this.emitChange(['state']);
  }


  get cancelReason() {
    // @ts-ignore
    return this._cancelReason;
  }
}

export {
  TaskInstance
};
// tslint:enable
