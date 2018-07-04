var QUnit = require("steal-qunit");
var GLOBAL = require("can-globals/global/global");
var canSymbol = require("can-symbol");
var canReflectPromise = require("can-reflect-promise");
var ObservationRecorder = require("can-observation-recorder");
var testHelpers = require("can-test-helpers");

var nativePromise = GLOBAL().Promise;
var Promise;

QUnit.module("can-reflect-promise", {
	setup: function() {
		// Make a temporary Promise subclass per suite, so that we can test before vs. after decoration
		//  in an isolated fashion
		function tempPromise() {
			if("Reflect" in GLOBAL() && typeof GLOBAL().Reflect.construct === "function") {
				// Must use ES6 Reflect in some environments where Promise is implemented
				//  as a non-callable ES6 class.
				return GLOBAL().Reflect.construct(nativePromise, arguments, tempPromise);
			} else {
				// If no Reflect in platform, assume ES5 is good.
				nativePromise.apply(this, arguments);
				return this;
			}
		}

		["resolve", "reject"].forEach(function(key) {
			if(~nativePromise[key].toString().indexOf("[native code]")) {
				// This works fine for platform native promises that know to return "new this" when constructing
				tempPromise[key] = nativePromise[key];
			} else {
				// Steal's promises aren't that smart, though.
				tempPromise[key] = new Function("value", "return new this(function(resolve, reject) { " + key + "(value); });");
			}
		});

		var protoDefs = {};
		protoDefs[canSymbol.for("can.observeData")] = {
			value: null,
			writable: true,
			configurable: true
		};
		protoDefs[canSymbol.for("can.getKeyValue")] = {
			value: null,
			writable: true,
			configurable: true
		};

		tempPromise.prototype = Object.create(nativePromise.prototype, protoDefs);

		Promise = tempPromise;
	},
	teardown: function() {
		Promise = null;
	}
});

QUnit.test("decorates promise", function() {
	QUnit.ok(!Promise.prototype[canSymbol.for("can.getKeyValue")], "no decoration");

	canReflectPromise(new Promise(function() {}));
	QUnit.ok(Promise.prototype[canSymbol.for("can.getKeyValue")], "has decoration");

});

QUnit.test("has all necessary symbols", function() {
	var p = new Promise(function() {});
	canReflectPromise(p);
	QUnit.ok(p[canSymbol.for("can.getKeyValue")], "can.getKeyValue");
	QUnit.ok(p[canSymbol.for("can.getValue")], "can.getValue");
	QUnit.ok(p[canSymbol.for("can.onKeyValue")], "can.onKeyValue");
	QUnit.ok(p[canSymbol.for("can.offKeyValue")], "can.offKeyValue");
	QUnit.equal(p[canSymbol.for("can.isValueLike")], false, "can.isValueLike");

});

QUnit.test("getKeyValue for promise-specific values", 8, function() {
	var p = Promise.resolve("a");
	canReflectPromise(p);
	QUnit.equal(p[canSymbol.for("can.getKeyValue")]("isPending"), true, "isPending true in sync");
	QUnit.equal(p[canSymbol.for("can.getKeyValue")]("isResolved"), false, "isResolved false in sync");
	QUnit.equal(p[canSymbol.for("can.getKeyValue")]("value"), undefined, "no value in sync");
	QUnit.equal(p[canSymbol.for("can.getKeyValue")]("state"), "pending", "state pending in sync");
	stop();

	setTimeout(function() {
		QUnit.equal(p[canSymbol.for("can.getKeyValue")]("value"), "a", "value in async");
		QUnit.equal(p[canSymbol.for("can.getKeyValue")]("isPending"), false, "isPending false in async");
		QUnit.equal(p[canSymbol.for("can.getKeyValue")]("isResolved"), true, "isResolved true in async");
		QUnit.equal(p[canSymbol.for("can.getKeyValue")]("state"), "resolved", "state resolved in async");
		start();
	}, 30);
});

QUnit.test("computable", 4, function() {
	stop(3);
	var p = Promise.resolve("a");
	canReflectPromise(p);
	ObservationRecorder.start();
	p[canSymbol.for("can.getKeyValue")]("value")
	var deps = ObservationRecorder.stop();
	QUnit.ok(deps.keyDependencies.has(p), "has the key dep");

	p[canSymbol.for("can.onKeyValue")]("value", function(newVal) {
		QUnit.equal(newVal, "a", "value updates on event");
		start();
	});
	p[canSymbol.for("can.onKeyValue")]("isResolved", function(newVal) {
		QUnit.equal(newVal, true, "isResolved updates on event");
		start();
	});
	p[canSymbol.for("can.onKeyValue")]("state", function(newVal) {
		QUnit.equal(newVal, "resolved", "state updates on event");
		start();
	});
});

testHelpers.dev.devOnlyTest("promise readers throw errors (#70)", function() {
	var teardown = testHelpers.dev.willError(/Rejected Reason/);

	var promise = Promise.reject("Rejected Reason");

	canReflectPromise(promise);

	// trigger initPromise
	promise[canSymbol.for("can.onKeyValue")]("value", function() {});

	stop();
	promise.catch(function() {
		QUnit.equal(teardown(), 1, 'error thrown');
		start();
	});
});

