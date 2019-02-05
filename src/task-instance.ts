import { defer } from './defer';
import { Changed, TaskInstanceSubscriber } from './types';

const RUNNING = 'running';
const WAITING = 'waiting';
const FINISHED = 'finished';
const CANCELED = 'canceled';
const DROPPED = 'dropped';

class TaskInstance {
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
    this.emitChange(['state', 'value']);
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

  get isRunning() {
    return !this.isFinished;
  }

  get isCanceled() {
    return this.isCanceling && this.isFinished;
  }

  get isCanceling() {
    return this._isCanceling;
  }

  set isCanceling(tf) {
    this._isCanceling = tf;
    this.emitChange(['state']);
  }

  get cancelReason() {
    return this._cancelReason;
  }

  public run: any;
  public itrResult: any;
  public itr: any;
  public deferred: any;
  private _subscribers: TaskInstanceSubscriber[];
  // private _state: 'running' | 'waiting' | 'finished' | 'canceled' | 'dropped';
  private _isSuccessful: boolean | null;
  private _value: any;
  private _hasStarted: boolean;
  private _isCanceling: boolean;
  private _cancelReason: string | null;
  private _isDropped: boolean;
  private _isFinished: boolean | null;
  private _error: any;

  constructor(genFn: any) {
    this._subscribers = [];
    // this._state = RUNNING;
    this._isSuccessful = null;
    this._isFinished = null;
    this._value = null;
    this._hasStarted = true;
    this._isCanceling = false;
    this._isDropped = false;
    this._cancelReason = null;
    this.itrResult = null;
    this.itr = genFn();

    this.run = (res: Promise<any>) => {
      this.itrResult = this.itr.next(res);

      if (this.itrResult.done) {
        this.value = this.itrResult.value;
        this.isSuccessful = true;
        return Promise.resolve(this.itrResult.value);
      }

      this.deferred = defer();

      this.deferred.promise.then(
        (result: any) => {
          if (this.isCanceled) {
            return;
          }

          return this.run(result);
        },

        (err: any) => {
          this.error = err;
          return this.itr.throw(this);
        }
      );

      this.deferred.resolve(this.itrResult.value);

      return this.deferred;
    };

    return this;
  }

  public emitChange(changedKeys: string[]) {
    const changed: Changed = {};
    changedKeys.forEach((c: string) => (changed[c] = 1));
    this._subscribers.forEach(s => s(changed, this));
  }

  public cancel(cancelReason = 'TODO add a reason for cancellation') {
    if (this.isCanceling || this.isFinished) {
      return;
    }

    /*
     * Batch changes by using _<prop>
     */

    if (cancelReason === DROPPED) {
      this._isDropped = true;
    }

    this._isCanceling = true;

    /*
     * TODO: get actual reasons
     */
    this._cancelReason = cancelReason;
    this._isFinished = true;
    this._value = Error(this._cancelReason);

    /*
     * If this is cancel aware promise (e.g. `timeout`), then
     * cancel and clean that up
     */
    if (typeof this.itrResult.value.cancel === 'function') {
      this.itrResult.value.cancel();
    }

    this.deferred.reject(this.itr.throw(this));
    this.emitChange(['state', 'value', 'cancelReason']);
  }

  public subscribe(subscriber: TaskInstanceSubscriber) {
    this._subscribers.push(subscriber);
    subscriber({ state: 1 }, this);

    const unsubscribe = () => {
      const index = this._subscribers.indexOf(subscriber);

      if (index !== -1) {
        this._subscribers.splice(index, 1);
      }

      /*
       * if we ever need any unsubscribe cleanup,
       * do it here here.
       */
    };

    return unsubscribe;
  }
}

export { TaskInstance };
