# can-reflect-promise

[![Greenkeeper badge](https://badges.greenkeeper.io/canjs/can-reflect-promise.svg)](https://greenkeeper.io/)

[![Build Status](https://travis-ci.org/canjs/can-reflect-promise.png?branch=master)](https://travis-ci.org/canjs/can-reflect-promise)

Decorate a promise with symbols for can-reflect compatibility.

- <code>[__can-reflect-promise__(Promise) ](#can-observation-)</code>

## API


## <code>__can-reflect-promise__ </code>



### <code>canReflectPromise(promise)</code>


#### promise `{Promise}`

Any sort of thenable: a native Promise, a library-provided Promise, or an object for which `.then` is a function.

```js
canReflectPromise(new Promise(function(resolve, reject) { ... }));
```
