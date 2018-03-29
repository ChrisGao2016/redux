/**
 * Composes single-argument functions from right to left. The rightmost
 * function can take multiple arguments as it provides the signature for
 * the resulting composite function.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing the argument functions
 * from right to left. For example, compose(f, g, h) is identical to doing
 * (...args) => f(g(h(...args))).
 */
// 参数列表为函数数组，将函数数组组装成从右至左执行的函数
export default function compose(...funcs) {
  // 如果函数列表为空返回箭头函数
  if (funcs.length === 0) {
    return arg => arg
  }
  // 如果函数列表只有一个函数，返回这个函数
  if (funcs.length === 1) {
    return funcs[0]
  }

  /*  最后一行代码相当于
    return (...args) => {
    let result = args;
    for (let i =funcs.length-1 ; i > 0;++i) {
      result = funcs[i](...result);
    }
    return result
  }
  */

  return funcs.reduce((a, b) => (...args) => a(b(...args)))
}

