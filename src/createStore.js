import $$observable from 'symbol-observable'

import ActionTypes from './utils/actionTypes'
import isPlainObject from './utils/isPlainObject'

/**
 * Creates a Redux store that holds the state tree.
 * The only way to change the data in the store is to call `dispatch()` on it.
 *
 * There should only be a single store in your app. To specify how different
 * parts of the state tree respond to actions, you may combine several reducers
 * into a single reducer function by using `combineReducers`.
 *
 * @param {Function} reducer A function that returns the next state tree, given
 * the current state tree and the action to handle.
 *
 * @param {any} [preloadedState] The initial state. You may optionally specify it
 * to hydrate the state from the server in universal apps, or to restore a
 * previously serialized user session.
 * If you use `combineReducers` to produce the root reducer function, this must be
 * an object with the same shape as `combineReducers` keys.
 *
 * @param {Function} [enhancer] The store enhancer. You may optionally specify it
 * to enhance the store with third-party capabilities such as middleware,
 * time travel, persistence, etc. The only store enhancer that ships with Redux
 * is `applyMiddleware()`.
 *
 * @returns {Store} A Redux store that lets you read the state, dispatch actions
 * and subscribe to changes.
 */
export default function createStore(reducer, preloadedState, enhancer) {
  // 如果只有两个参数，且第二个参数是函数就交换第二个参数和第三个参数的值
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    enhancer = preloadedState
    preloadedState = undefined
  }

  // enhancer值验证
  if (typeof enhancer !== 'undefined') {
    if (typeof enhancer !== 'function') {
      throw new Error('Expected the enhancer to be a function.')
    }
    // 如果有值执行
    return enhancer(createStore)(reducer, preloadedState)
  }

  if (typeof reducer !== 'function') {
    throw new Error('Expected the reducer to be a function.')
  }

  let currentReducer = reducer // 保存当前的reducer
  let currentState = preloadedState // 当前的state，初始化值为preloadedState
  let currentListeners = [] // 当前的state变动监听器队列
  let nextListeners = currentListeners   // 当前监听器的副本
  let isDispatching = false // 是否有action在执行中，避免reducer的时候dispatch，造成死循环

  //函数作用为创建当前监听器副本，将currentListeners复制给nextListeners
  // 为了避免执行监听器队列时通过subcript增加或减少监听器而影响最后一次监听器队列的执行，
  // 不直接修改currentListeners,而修改其副本nextListeners，每次更改和执行监听器队列时执行此函数
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = currentListeners.slice()
    }
  }

  // 返回当前应用store存储的state
  function getState() {
    // 安全检查是否有action在执行中，如果有则不能取state
    if (isDispatching) {
      throw new Error(
        'You may not call store.getState() while the reducer is executing. ' +
          'The reducer has already received the state as an argument. ' +
          'Pass it down from the top reducer instead of reading it from the store.'
      )
    }

    return currentState
  }

  // 增加监听器方法
  function subscribe(listener) {
    // 验证listener是否是函数
    if (typeof listener !== 'function') {
      throw new Error('Expected the listener to be a function.')
    }

    // 有action正在处理时抛出错误, 因为有reducer执行的时候如果调用subScribe方法，state改变后新增的listener不会被通知到
    if (isDispatching) {
      throw new Error(
        'You may not call store.subscribe() while the reducer is executing. ' +
          'If you would like to be notified after the store has been updated, subscribe from a ' +
          'component and invoke store.getState() in the callback to access the latest state. ' +
          'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
      )
    }

    //使用闭包变量表示当前监听器是否被订阅，在unsubscribe函数机取消订阅时使用，防止重复执行取消订阅
    let isSubscribed = true

    // 更改监听器队列前，创建当前监听器副本
    ensureCanMutateNextListeners()
    // 新增监听器到当前监听器副本
    nextListeners.push(listener)

    // 返回取消订阅函数
    return function unsubscribe() {
      // 如果已经取消订阅，立即退出
      if (!isSubscribed) {
        return
      }
       // 有action正在处理时抛出错误
      if (isDispatching) {
        throw new Error(
          'You may not unsubscribe from a store listener while the reducer is executing. ' +
            'See http://redux.js.org/docs/api/Store.html#subscribe for more details.'
        )
      }
      //取消订阅后，将标志位置为false
      isSubscribed = false
      // 同步当前标志位副本，删除当前监听器
      ensureCanMutateNextListeners()
      const index = nextListeners.indexOf(listener)
      nextListeners.splice(index, 1)
    }
  }

  /**
   * Dispatches an action. It is the only way to trigger a state change.
   *
   * The `reducer` function, used to create the store, will be called with the
   * current state tree and the given `action`. Its return value will
   * be considered the **next** state of the tree, and the change listeners
   * will be notified.
   *
   * The base implementation only supports plain object actions. If you want to
   * dispatch a Promise, an Observable, a thunk, or something else, you need to
   * wrap your store creating function into the corresponding middleware. For
   * example, see the documentation for the `redux-thunk` package. Even the
   * middleware will eventually dispatch plain object actions using this method.
   *
   * @param {Object} action A plain object representing “what changed”. It is
   * a good idea to keep actions serializable so you can record and replay user
   * sessions, or use the time travelling `redux-devtools`. An action must have
   * a `type` property which may not be `undefined`. It is a good idea to use
   * string constants for action types.
   *
   * @returns {Object} For convenience, the same action object you dispatched.
   *
   * Note that, if you use a custom middleware, it may wrap `dispatch()` to
   * return something else (for example, a Promise you can await).
   */
  function dispatch(action) {
    // action类型检查，是否为key/value的纯对象
    if (!isPlainObject(action)) {
      throw new Error(
        'Actions must be plain objects. ' +
          'Use custom middleware for async actions.'
      )
    }
    // action中是否有type字段
    if (typeof action.type === 'undefined') {
      throw new Error(
        'Actions may not have an undefined "type" property. ' +
          'Have you misspelled a constant?'
      )
    }

    // 有action正在处理时抛出错误
    if (isDispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    try {
      isDispatching = true
      currentState = currentReducer(currentState, action) // 执行reducer
    } finally {
      isDispatching = false
    }

    // 执行完reducer后通知监听器队列
    const listeners = (currentListeners = nextListeners)
    for (let i = 0; i < listeners.length; i++) {
      const listener = listeners[i]
      listener()
    }

    return action
  }

  /**
   * Replaces the reducer currently used by the store to calculate the state.
   *
   * You might need this if your app implements code splitting and you want to
   * load some of the reducers dynamically. You might also need this if you
   * implement a hot reloading mechanism for Redux.
   *
   * @param {Function} nextReducer The reducer for the store to use instead.
   * @returns {void}
   */
  // 替换reducer
  function replaceReducer(nextReducer) {
    // 类型检查
    if (typeof nextReducer !== 'function') {
      throw new Error('Expected the nextReducer to be a function.')
    }

    // 替换reducer
    currentReducer = nextReducer
    // 发送redux内部action表示替换reducer
    dispatch({ type: ActionTypes.REPLACE })
  }

  // 订阅者模式，配合reactive库使用，一般开发时用不到
  function observable() {
    const outerSubscribe = subscribe
    return {
      subscribe(observer) {
        if (typeof observer !== 'object') {
          throw new TypeError('Expected the observer to be an object.')
        }

        function observeState() {
          if (observer.next) {
            observer.next(getState())
          }
        }

        observeState()
        const unsubscribe = outerSubscribe(observeState)
        return { unsubscribe }
      },

      [$$observable]() {
        return this
      }
    }
  }

  // 创建store时发送初始化action，使每个reducer返回自己的初始化state
  // 有效的填充初始状态树
  dispatch({ type: ActionTypes.INIT })

  return {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [$$observable]: observable
  }
}
