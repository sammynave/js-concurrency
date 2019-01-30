(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.jsc = {}));
}(this, function (exports) { 'use strict';

	function noop() {}

	function assign(tar, src) {
		for (var k in src) tar[k] = src[k];
		return tar;
	}

	function assignTrue(tar, src) {
		for (var k in src) tar[k] = 1;
		return tar;
	}

	function callAfter(fn, i) {
		if (i === 0) fn();
		return () => {
			if (!--i) fn();
		};
	}

	function run(fn) {
		fn();
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detachNode(node) {
		node.parentNode.removeChild(node);
	}

	function destroyEach(iterations, detach) {
		for (var i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detach);
		}
	}

	function createElement(name) {
		return document.createElement(name);
	}

	function createText(data) {
		return document.createTextNode(data);
	}

	function addListener(node, event, handler, options) {
		node.addEventListener(event, handler, options);
	}

	function removeListener(node, event, handler, options) {
		node.removeEventListener(event, handler, options);
	}

	function setData(text, data) {
		text.data = '' + data;
	}

	function blankObject() {
		return Object.create(null);
	}

	function destroy(detach) {
		this.destroy = noop;
		this.fire('destroy');
		this.set = noop;

		this._fragment.d(detach !== false);
		this._fragment = null;
		this._state = {};
	}

	function _differs(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function fire(eventName, data) {
		var handlers =
			eventName in this._handlers && this._handlers[eventName].slice();
		if (!handlers) return;

		for (var i = 0; i < handlers.length; i += 1) {
			var handler = handlers[i];

			if (!handler.__calling) {
				try {
					handler.__calling = true;
					handler.call(this, data);
				} finally {
					handler.__calling = false;
				}
			}
		}
	}

	function flush(component) {
		component._lock = true;
		callAll(component._beforecreate);
		callAll(component._oncreate);
		callAll(component._aftercreate);
		component._lock = false;
	}

	function get() {
		return this._state;
	}

	function init(component, options) {
		component._handlers = blankObject();
		component._slots = blankObject();
		component._bind = options._bind;
		component._staged = {};

		component.options = options;
		component.root = options.root || component;
		component.store = options.store || component.root.store;

		if (!options.root) {
			component._beforecreate = [];
			component._oncreate = [];
			component._aftercreate = [];
		}
	}

	function on(eventName, handler) {
		var handlers = this._handlers[eventName] || (this._handlers[eventName] = []);
		handlers.push(handler);

		return {
			cancel: function() {
				var index = handlers.indexOf(handler);
				if (~index) handlers.splice(index, 1);
			}
		};
	}

	function set(newState) {
		this._set(assign({}, newState));
		if (this.root._lock) return;
		flush(this.root);
	}

	function _set(newState) {
		var oldState = this._state,
			changed = {},
			dirty = false;

		newState = assign(this._staged, newState);
		this._staged = {};

		for (var key in newState) {
			if (this._differs(newState[key], oldState[key])) changed[key] = dirty = true;
		}
		if (!dirty) return;

		this._state = assign(assign({}, oldState), newState);
		this._recompute(changed, this._state);
		if (this._bind) this._bind(changed, this._state);

		if (this._fragment) {
			this.fire("state", { changed: changed, current: this._state, previous: oldState });
			this._fragment.p(changed, this._state);
			this.fire("update", { changed: changed, current: this._state, previous: oldState });
		}
	}

	function _stage(newState) {
		assign(this._staged, newState);
	}

	function callAll(fns) {
		while (fns && fns.length) fns.shift()();
	}

	function _mount(target, anchor) {
		this._fragment[this._fragment.i ? 'i' : 'm'](target, anchor || null);
	}

	var proto = {
		destroy,
		get,
		fire,
		on,
		set,
		_recompute: noop,
		_set,
		_stage,
		_mount,
		_differs
	};

	const RUNNING  = 'running';
	const WAITING  = 'waiting';
	const FINISHED = 'finished';
	const CANCELED = 'canceled';
	const DROPPED  = 'dropped';

	class TaskInstance {
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
	        this.value = result.value;
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
	    };

	    run(itr.next());

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

	const IDLE    = 'idle';
	const RUNNING$1 = 'running';
	const QUEUED  = 'queued';


	/*
	 * TODO
	 * make a `Task` class and move this stuff there
	 * or convert to a functional style.
	 */
	const task = (genFn, { drop = true, maxConcurrency = 1 } = {}) => {
	  let subscribers = [];
	  return {
	    concurrency: 0,
	    performCount: 0,
	    droppedCount: 0,
	    state: IDLE,


	    subscribe(subscriber) {
	      subscribers.push(subscriber);
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
	    },



	    perform() {
	      let immediatelyCancel = false;
	      if (this.concurrency >= maxConcurrency) {
	        immediatelyCancel = true;
	      } else {
	        this.performCount++;
	        this.concurrency++;
	      }

	      const taskInstance = new TaskInstance(genFn, { immediatelyCancel });

	      /*
	       * TODO: need to check if ANY instance `state`
	       * is `running` or `queued`, not just the
	       * most recent one
	       */
	      taskInstance.subscribe((changed, { state: tiState }) => {
	        if (changed.state) {
	          this.state = IDLE;

	          if (tiState === 'running') {
	            this.state = RUNNING$1;
	          }

	          if (tiState === 'queued') {
	            this.state = QUEUED;
	          }

	          if (tiState === 'finished') {
	            this.concurrency--;
	          }

	          if (tiState === 'dropped') {
	            this.droppedCount++;
	          }

	          subscribers.forEach(s => s({ state: 1 }, this));
	        }
	      });

	      return taskInstance;
	    }
	  }
	};

	/* docs/src/BasicExample.html generated by Svelte v2.16.0 */

	var methods = {
	  click() {
	    const { random } = this.get();
	    random.perform();
	    this.set({ performCount: random.performCount });
	  }
	};

	function oncreate() {
	  const ctx = this;
	  const random = task(function *() {
	    let nums = [];

	    for (let i = 0; i < 3; i++) {
	      nums.push(Math.floor(Math.random() * 10));
	    }

	    ctx.set({ result: nums.join(', ') });
	  });
	  this.set({ random, performCount: random.performCount });
	}
	function create_main_fragment(component, ctx) {
		var h3, text1, div, text2, text3, button, text5, span, text6, text7, current;

		function click_handler(event) {
			component.click();
		}

		return {
			c() {
				h3 = createElement("h3");
				h3.textContent = "random numbers";
				text1 = createText("\n\n");
				div = createElement("div");
				text2 = createText(ctx.performCount);
				text3 = createText("\n\n");
				button = createElement("button");
				button.textContent = "pick random numbers";
				text5 = createText("\n\n");
				span = createElement("span");
				text6 = createText("random number: ");
				text7 = createText(ctx.result);
				addListener(button, "click", click_handler);
			},

			m(target, anchor) {
				insert(target, h3, anchor);
				insert(target, text1, anchor);
				insert(target, div, anchor);
				append(div, text2);
				insert(target, text3, anchor);
				insert(target, button, anchor);
				insert(target, text5, anchor);
				insert(target, span, anchor);
				append(span, text6);
				append(span, text7);
				current = true;
			},

			p(changed, ctx) {
				if (changed.performCount) {
					setData(text2, ctx.performCount);
				}

				if (changed.result) {
					setData(text7, ctx.result);
				}
			},

			i(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d(detach) {
				if (detach) {
					detachNode(h3);
					detachNode(text1);
					detachNode(div);
					detachNode(text3);
					detachNode(button);
				}

				removeListener(button, "click", click_handler);
				if (detach) {
					detachNode(text5);
					detachNode(span);
				}
			}
		};
	}

	function BasicExample(options) {
		init(this, options);
		this._state = assign({}, options.data);
		this._intro = !!options.intro;

		this._fragment = create_main_fragment(this, this._state);

		this.root._oncreate.push(() => {
			oncreate.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(BasicExample.prototype, proto);
	assign(BasicExample.prototype, methods);

	/* docs/src/UsingYield.html generated by Svelte v2.16.0 */

	function data() {
	  return {
	    taskStates: [],
	    taskInstanceStates: []
	  }
	}
	var methods$1 = {
	  click(err) {
	    const { nameTask } = this.get();
	    this.set({ throwError: err });
	    const getRandomName = nameTask.perform();

	    const unsubscribeTask = getRandomName.subscribe((changed, { state, value }) => {
	        /*
	         * TODO: slightly annoying to push this onto
	         * the user. think of a better way
	         */
	        if (changed.state) {
	          const taskInstanceStates = this.get().taskInstanceStates;
	          this.set({
	            taskInstanceState: state,
	            taskInstanceStates: taskInstanceStates.concat([state])
	          });
	        }

	        if (changed.value) {
	          console.log(value);
	        }
	    });


	    this.set({ performCount: nameTask.performCount });
	  }
	};

	function oncreate$1() {
	  const ctx = this;
	  const nameTask = task(function *() {
	    if (ctx.get().throwError) {
	      try {
	        const resp = yield fetch('http://somebadurlthatdoesntexist');
	      } catch (e) {
	        ctx.set({ error: e.error });
	      }
	    } else {

	      const resp = yield fetch('http://faker.hook.io/?property=name.findName&locale=en');
	      const name = yield resp.text();

	      ctx.set({ name });
	    }
	  });

	  const nameTaskUnsubscribe = nameTask.subscribe((changed, { state }) => {
	    if (changed.state) {
	      const taskStates = this.get().taskStates;
	      this.set({
	        taskState: state,
	        taskStates: taskStates.concat([state])
	      });
	    }
	  });

	  this.set({ nameTask, performCount: nameTask.performCount });
	}
	function get_each1_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.state = list[i];
		return child_ctx;
	}

	function get_each0_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.state = list[i];
		return child_ctx;
	}

	function create_main_fragment$1(component, ctx) {
		var h3, text1, h40, text3, div5, div0, text4, text5, text6, div1, text7, text8, text9, div2, text10, text11, text12, div3, button0, text14, text15, text16, div4, button1, text18, text19, text20, div6, h41, text22, text23, div7, h42, text25, current;

		function click_handler(event) {
			component.click();
		}

		function click_handler_1(event) {
			component.click(true);
		}

		var each0_value = ctx.taskStates;

		var each0_blocks = [];

		for (var i = 0; i < each0_value.length; i += 1) {
			each0_blocks[i] = create_each_block_1(component, get_each0_context(ctx, each0_value, i));
		}

		var each1_value = ctx.taskInstanceStates;

		var each1_blocks = [];

		for (var i = 0; i < each1_value.length; i += 1) {
			each1_blocks[i] = create_each_block(component, get_each1_context(ctx, each1_value, i));
		}

		return {
			c() {
				h3 = createElement("h3");
				h3.textContent = "using `yield` - fetch random name from faker.io";
				text1 = createText("\n");
				h40 = createElement("h4");
				h40.textContent = "maxConcurrency = 1; drop = true;";
				text3 = createText("\n\n");
				div5 = createElement("div");
				div0 = createElement("div");
				text4 = createText("count: ");
				text5 = createText(ctx.performCount);
				text6 = createText("\n  ");
				div1 = createElement("div");
				text7 = createText("task instance status: ");
				text8 = createText(ctx.taskInstanceState);
				text9 = createText("\n  ");
				div2 = createElement("div");
				text10 = createText("task status: ");
				text11 = createText(ctx.taskState);
				text12 = createText("\n  ");
				div3 = createElement("div");
				button0 = createElement("button");
				button0.textContent = "random name";
				text14 = createText(" fetch random name: ");
				text15 = createText(ctx.name);
				text16 = createText("\n  ");
				div4 = createElement("div");
				button1 = createElement("button");
				button1.textContent = "throw error";
				text18 = createText(" ");
				text19 = createText(ctx.error);
				text20 = createText("\n\n");
				div6 = createElement("div");
				h41 = createElement("h4");
				h41.textContent = "taskStates";
				text22 = createText("\n  ");

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].c();
				}

				text23 = createText("\n\n");
				div7 = createElement("div");
				h42 = createElement("h4");
				h42.textContent = "taskInstanceStates";
				text25 = createText("\n  ");

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].c();
				}
				addListener(button0, "click", click_handler);
				addListener(button1, "click", click_handler_1);
				div6.className = "state-list svelte-1ljunyb";
				div7.className = "state-list svelte-1ljunyb";
			},

			m(target, anchor) {
				insert(target, h3, anchor);
				insert(target, text1, anchor);
				insert(target, h40, anchor);
				insert(target, text3, anchor);
				insert(target, div5, anchor);
				append(div5, div0);
				append(div0, text4);
				append(div0, text5);
				append(div5, text6);
				append(div5, div1);
				append(div1, text7);
				append(div1, text8);
				append(div5, text9);
				append(div5, div2);
				append(div2, text10);
				append(div2, text11);
				append(div5, text12);
				append(div5, div3);
				append(div3, button0);
				append(div3, text14);
				append(div3, text15);
				append(div5, text16);
				append(div5, div4);
				append(div4, button1);
				append(div4, text18);
				append(div4, text19);
				insert(target, text20, anchor);
				insert(target, div6, anchor);
				append(div6, h41);
				append(div6, text22);

				for (var i = 0; i < each0_blocks.length; i += 1) {
					each0_blocks[i].m(div6, null);
				}

				insert(target, text23, anchor);
				insert(target, div7, anchor);
				append(div7, h42);
				append(div7, text25);

				for (var i = 0; i < each1_blocks.length; i += 1) {
					each1_blocks[i].m(div7, null);
				}

				current = true;
			},

			p(changed, ctx) {
				if (changed.performCount) {
					setData(text5, ctx.performCount);
				}

				if (changed.taskInstanceState) {
					setData(text8, ctx.taskInstanceState);
				}

				if (changed.taskState) {
					setData(text11, ctx.taskState);
				}

				if (changed.name) {
					setData(text15, ctx.name);
				}

				if (changed.error) {
					setData(text19, ctx.error);
				}

				if (changed.taskStates) {
					each0_value = ctx.taskStates;

					for (var i = 0; i < each0_value.length; i += 1) {
						const child_ctx = get_each0_context(ctx, each0_value, i);

						if (each0_blocks[i]) {
							each0_blocks[i].p(changed, child_ctx);
						} else {
							each0_blocks[i] = create_each_block_1(component, child_ctx);
							each0_blocks[i].c();
							each0_blocks[i].m(div6, null);
						}
					}

					for (; i < each0_blocks.length; i += 1) {
						each0_blocks[i].d(1);
					}
					each0_blocks.length = each0_value.length;
				}

				if (changed.taskInstanceStates) {
					each1_value = ctx.taskInstanceStates;

					for (var i = 0; i < each1_value.length; i += 1) {
						const child_ctx = get_each1_context(ctx, each1_value, i);

						if (each1_blocks[i]) {
							each1_blocks[i].p(changed, child_ctx);
						} else {
							each1_blocks[i] = create_each_block(component, child_ctx);
							each1_blocks[i].c();
							each1_blocks[i].m(div7, null);
						}
					}

					for (; i < each1_blocks.length; i += 1) {
						each1_blocks[i].d(1);
					}
					each1_blocks.length = each1_value.length;
				}
			},

			i(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d(detach) {
				if (detach) {
					detachNode(h3);
					detachNode(text1);
					detachNode(h40);
					detachNode(text3);
					detachNode(div5);
				}

				removeListener(button0, "click", click_handler);
				removeListener(button1, "click", click_handler_1);
				if (detach) {
					detachNode(text20);
					detachNode(div6);
				}

				destroyEach(each0_blocks, detach);

				if (detach) {
					detachNode(text23);
					detachNode(div7);
				}

				destroyEach(each1_blocks, detach);
			}
		};
	}

	// (31:2) {#each taskStates as state}
	function create_each_block_1(component, ctx) {
		var span, text_value = ctx.state, text;

		return {
			c() {
				span = createElement("span");
				text = createText(text_value);
				span.className = "state svelte-1ljunyb";
			},

			m(target, anchor) {
				insert(target, span, anchor);
				append(span, text);
			},

			p(changed, ctx) {
				if ((changed.taskStates) && text_value !== (text_value = ctx.state)) {
					setData(text, text_value);
				}
			},

			d(detach) {
				if (detach) {
					detachNode(span);
				}
			}
		};
	}

	// (38:2) {#each taskInstanceStates as state}
	function create_each_block(component, ctx) {
		var span, text_value = ctx.state, text;

		return {
			c() {
				span = createElement("span");
				text = createText(text_value);
				span.className = "state svelte-1ljunyb";
			},

			m(target, anchor) {
				insert(target, span, anchor);
				append(span, text);
			},

			p(changed, ctx) {
				if ((changed.taskInstanceStates) && text_value !== (text_value = ctx.state)) {
					setData(text, text_value);
				}
			},

			d(detach) {
				if (detach) {
					detachNode(span);
				}
			}
		};
	}

	function UsingYield(options) {
		init(this, options);
		this._state = assign(data(), options.data);
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$1(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$1.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(UsingYield.prototype, proto);
	assign(UsingYield.prototype, methods$1);

	/* docs/src/MaxConcurrency.html generated by Svelte v2.16.0 */

	function data$1() {
	  return {
	    states: []
	  };
	}
	var methods$2 = {
	  click() {
	    const { random, performCount } = this.get();
	    const color = (performCount & 1) ? 'green' : 'blue';
	    this.set({ color });
	    const instance = random.perform();

	    instance.subscribe((changed, { state, value }) => {
	      const { states } = this.get();

	      if (changed.value) {
	        this.set({ states: states.concat([{ value, color }]) });
	      }

	      if (state === 'dropped' || state === 'running') {
	        this.set({ states: states.concat([{ value: state, color }]) });
	      }
	    });

	    this.set({
	      performCount: random.performCount,
	      droppedCount: random.droppedCount
	    });
	  }
	};

	function oncreate$2() {
	  const ctx = this;
	  const random = task(function *() {
	    let nums = [];

	    for (let i = 0; i < 3; i++) {
	      nums.push(Math.floor(Math.random() * 10));
	    }

	    // Fake waiting
	    yield new Promise((resolve) => {
	      setTimeout(resolve, 2000);
	    });

	    ctx.set({
	      result: nums.join(', ')
	    });

	    return nums.join(', ');
	  }, { maxConcurrency: 3 });

	  random.subscribe((changed, { concurrency }) => {
	    this.set({
	      concurrency: random.concurrency,
	    });
	  });

	  this.set({
	    random,
	    concurrency: random.concurrency,
	    performCount: random.performCount,
	    droppedCount: random.droppedCount
	  });
	}
	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.state = list[i];
		return child_ctx;
	}

	function create_main_fragment$2(component, ctx) {
		var h3, text1, div0, text2, text3, text4, div1, text5, text6, text7, div2, text8, text9, text10, button, text12, span, text13, text14, text15, div3, h4, text17, current;

		function click_handler(event) {
			component.click();
		}

		var each_value = ctx.states;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(component, get_each_context(ctx, each_value, i));
		}

		return {
			c() {
				h3 = createElement("h3");
				h3.textContent = "maxConcurrency = 3";
				text1 = createText("\n\n");
				div0 = createElement("div");
				text2 = createText("performCount: ");
				text3 = createText(ctx.performCount);
				text4 = createText("\n");
				div1 = createElement("div");
				text5 = createText("droppedCount: ");
				text6 = createText(ctx.droppedCount);
				text7 = createText("\n");
				div2 = createElement("div");
				text8 = createText("concurrency: ");
				text9 = createText(ctx.concurrency);
				text10 = createText("\n\n");
				button = createElement("button");
				button.textContent = "pick random numbers";
				text12 = createText("\n\n");
				span = createElement("span");
				text13 = createText("random number: ");
				text14 = createText(ctx.result);
				text15 = createText("\n\n");
				div3 = createElement("div");
				h4 = createElement("h4");
				h4.textContent = "task results";
				text17 = createText("\n  ");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				addListener(button, "click", click_handler);
				div3.className = "state-list svelte-9usqt5";
			},

			m(target, anchor) {
				insert(target, h3, anchor);
				insert(target, text1, anchor);
				insert(target, div0, anchor);
				append(div0, text2);
				append(div0, text3);
				insert(target, text4, anchor);
				insert(target, div1, anchor);
				append(div1, text5);
				append(div1, text6);
				insert(target, text7, anchor);
				insert(target, div2, anchor);
				append(div2, text8);
				append(div2, text9);
				insert(target, text10, anchor);
				insert(target, button, anchor);
				insert(target, text12, anchor);
				insert(target, span, anchor);
				append(span, text13);
				append(span, text14);
				insert(target, text15, anchor);
				insert(target, div3, anchor);
				append(div3, h4);
				append(div3, text17);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div3, null);
				}

				current = true;
			},

			p(changed, ctx) {
				if (changed.performCount) {
					setData(text3, ctx.performCount);
				}

				if (changed.droppedCount) {
					setData(text6, ctx.droppedCount);
				}

				if (changed.concurrency) {
					setData(text9, ctx.concurrency);
				}

				if (changed.result) {
					setData(text14, ctx.result);
				}

				if (changed.states) {
					each_value = ctx.states;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$1(component, child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div3, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			i(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o: run,

			d(detach) {
				if (detach) {
					detachNode(h3);
					detachNode(text1);
					detachNode(div0);
					detachNode(text4);
					detachNode(div1);
					detachNode(text7);
					detachNode(div2);
					detachNode(text10);
					detachNode(button);
				}

				removeListener(button, "click", click_handler);
				if (detach) {
					detachNode(text12);
					detachNode(span);
					detachNode(text15);
					detachNode(div3);
				}

				destroyEach(each_blocks, detach);
			}
		};
	}

	// (36:2) {#each states as state}
	function create_each_block$1(component, ctx) {
		var span, text_value = ctx.state.value, text, span_class_value;

		return {
			c() {
				span = createElement("span");
				text = createText(text_value);
				span.className = span_class_value = "state " + ctx.state.color + " svelte-9usqt5";
			},

			m(target, anchor) {
				insert(target, span, anchor);
				append(span, text);
			},

			p(changed, ctx) {
				if ((changed.states) && text_value !== (text_value = ctx.state.value)) {
					setData(text, text_value);
				}

				if ((changed.states) && span_class_value !== (span_class_value = "state " + ctx.state.color + " svelte-9usqt5")) {
					span.className = span_class_value;
				}
			},

			d(detach) {
				if (detach) {
					detachNode(span);
				}
			}
		};
	}

	function MaxConcurrency(options) {
		init(this, options);
		this._state = assign(data$1(), options.data);
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$2(this, this._state);

		this.root._oncreate.push(() => {
			oncreate$2.call(this);
			this.fire("update", { changed: assignTrue({}, this._state), current: this._state });
		});

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(MaxConcurrency.prototype, proto);
	assign(MaxConcurrency.prototype, methods$2);

	/* docs/App.html generated by Svelte v2.16.0 */





	function create_main_fragment$3(component, ctx) {
		var h1, text1, text2, text3, current;

		var basicexample = new BasicExample({
			root: component.root,
			store: component.store
		});

		var usingyield = new UsingYield({
			root: component.root,
			store: component.store
		});

		var maxconcurrency = new MaxConcurrency({
			root: component.root,
			store: component.store
		});

		return {
			c() {
				h1 = createElement("h1");
				h1.textContent = "js-concurrency";
				text1 = createText("\n\n");
				basicexample._fragment.c();
				text2 = createText("\n\n");
				usingyield._fragment.c();
				text3 = createText("\n\n");
				maxconcurrency._fragment.c();
			},

			m(target, anchor) {
				insert(target, h1, anchor);
				insert(target, text1, anchor);
				basicexample._mount(target, anchor);
				insert(target, text2, anchor);
				usingyield._mount(target, anchor);
				insert(target, text3, anchor);
				maxconcurrency._mount(target, anchor);
				current = true;
			},

			p: noop,

			i(target, anchor) {
				if (current) return;

				this.m(target, anchor);
			},

			o(outrocallback) {
				if (!current) return;

				outrocallback = callAfter(outrocallback, 3);

				if (basicexample) basicexample._fragment.o(outrocallback);
				if (usingyield) usingyield._fragment.o(outrocallback);
				if (maxconcurrency) maxconcurrency._fragment.o(outrocallback);
				current = false;
			},

			d(detach) {
				if (detach) {
					detachNode(h1);
					detachNode(text1);
				}

				basicexample.destroy(detach);
				if (detach) {
					detachNode(text2);
				}

				usingyield.destroy(detach);
				if (detach) {
					detachNode(text3);
				}

				maxconcurrency.destroy(detach);
			}
		};
	}

	function App(options) {
		init(this, options);
		this._state = assign({}, options.data);
		this._intro = !!options.intro;

		this._fragment = create_main_fragment$3(this, this._state);

		if (options.target) {
			this._fragment.c();
			this._mount(options.target, options.anchor);

			flush(this);
		}

		this._intro = true;
	}

	assign(App.prototype, proto);

	const app = new App({
	  target: document.getElementById('docs')
	});

	exports.app = app;

	Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=js-concurrency-docs.js.map
