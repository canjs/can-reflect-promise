/*can-reflect-promise@1.1.0#can-reflect-promise*/
define([
    'require',
    'exports',
    'module',
    'can-reflect',
    'can-symbol',
    'can-util/js/dev',
    'can-observation',
    'can-cid',
    'can-util/js/assign',
    'can-event',
    'can-util/js/single-reference'
], function (require, exports, module) {
    var canReflect = require('can-reflect');
    var canSymbol = require('can-symbol');
    var dev = require('can-util/js/dev');
    var Observation = require('can-observation');
    var CID = require('can-cid');
    var assign = require('can-util/js/assign');
    var canEvent = require('can-event');
    var singleReference = require('can-util/js/single-reference');
    var getValueSymbol = canSymbol.for('can.getValue'), getKeyValueSymbol = canSymbol.for('can.getKeyValue'), onValueSymbol = canSymbol.for('can.onValue'), onKeyValueSymbol = canSymbol.for('can.onKeyValue'), offKeyValueSymbol = canSymbol.for('can.offKeyValue'), observeDataSymbol = canSymbol.for('can.observeData');
    var promiseDataPrototype = {
        isPending: true,
        state: 'pending',
        isResolved: false,
        isRejected: false,
        value: undefined,
        reason: undefined
    };
    assign(promiseDataPrototype, canEvent);
    canReflect.set(promiseDataPrototype, onKeyValueSymbol, function (key, handler) {
        var observeData = this;
        var translated = function () {
            handler(observeData[key]);
        };
        singleReference.set(handler, this, translated, key);
        canEvent.on.call(this, 'state', translated);
    });
    canReflect.set(promiseDataPrototype, offKeyValueSymbol, function (key, handler) {
        var translated = singleReference.getAndDelete(handler, this, key);
        canEvent.off.call(this, 'state', translated);
    });
    function initPromise(promise) {
        var observeData = promise[observeDataSymbol];
        if (!observeData) {
            Object.defineProperty(promise, observeDataSymbol, {
                enumerable: false,
                configurable: false,
                writable: false,
                value: Object.create(promiseDataPrototype)
            });
            observeData = promise[observeDataSymbol];
            CID(observeData);
        }
        promise.then(function (value) {
            observeData.isPending = false;
            observeData.isResolved = true;
            observeData.value = value;
            observeData.state = 'resolved';
            observeData.dispatch('state', [
                'resolved',
                'pending'
            ]);
        }, function (reason) {
            observeData.isPending = false;
            observeData.isRejected = true;
            observeData.reason = reason;
            observeData.state = 'rejected';
            observeData.dispatch('state', [
                'rejected',
                'pending'
            ]);
        });
    }
    function setupPromise(value) {
        var oldPromiseFn;
        var proto = 'getPrototypeOf' in Object ? Object.getPrototypeOf(value) : value.__proto__;
        if (value[getKeyValueSymbol] && value[observeDataSymbol]) {
            return;
        }
        if (proto === null || proto === Object.prototype) {
            proto = value;
            if (typeof proto.promise === 'function') {
                oldPromiseFn = proto.promise;
                proto.promise = function () {
                    var result = oldPromiseFn.call(proto);
                    setupPromise(result);
                    return result;
                };
            }
        }
        [
            getKeyValueSymbol,
            function (key) {
                if (!this[observeDataSymbol]) {
                    initPromise(this);
                }
                Observation.add(this[observeDataSymbol], 'state');
                switch (key) {
                case 'state':
                case 'isPending':
                case 'isResolved':
                case 'isRejected':
                case 'value':
                case 'reason':
                    return this[observeDataSymbol][key];
                default:
                    return this[key];
                }
            },
            getValueSymbol,
            function () {
                return this[getKeyValueSymbol]('value');
            },
            canSymbol.for('can.isValueLike'),
            false,
            onValueSymbol,
            function (handler) {
                return this[onKeyValueSymbol]('value', handler);
            },
            onKeyValueSymbol,
            function (key, handler) {
                if (!this[observeDataSymbol]) {
                    initPromise(this);
                }
                var promise = this;
                var translated = function () {
                    handler(promise[getKeyValueSymbol](key));
                };
                singleReference.set(handler, this, translated, key);
                canEvent.on.call(this[observeDataSymbol], 'state', translated);
            },
            canSymbol.for('can.offValue'),
            function (handler) {
                return this[offKeyValueSymbol]('value', handler);
            },
            offKeyValueSymbol,
            function (key, handler) {
                var translated = singleReference.getAndDelete(handler, this, key);
                if (translated) {
                    canEvent.off.call(this[observeDataSymbol], 'state', translated);
                }
            }
        ].forEach(function (symbol, index, list) {
            if (index % 2 === 0) {
                canReflect.set(proto, symbol, list[index + 1]);
            }
        });
    }
    module.exports = setupPromise;
});