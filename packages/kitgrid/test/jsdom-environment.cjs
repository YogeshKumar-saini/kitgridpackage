// jest-environment-jsdom pins jsdom 26, which has no PointerEvent; the suite
// needs a current jsdom, so wire it into Jest's abstract jsdom environment.
const JSDOMEnvironment = require("@jest/environment-jsdom-abstract").default
const jsdom = require("jsdom")

module.exports = class KitgridEnvironment extends JSDOMEnvironment {
  constructor(config, context) {
    super(config, context, jsdom)
  }
}
