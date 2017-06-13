var QUnit = require("steal-qunit");
var GLOBAL = require("can-util/js/global/global");
var canSymbol = require("can-symbol");
var canReflectPromise = require("can-reflect-promise");
var $ = require("can-jquery");

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
		tempPromise.prototype = Object.create(nativePromise.prototype);

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
	QUnit.ok(p[canSymbol.for("can.onValue")], "can.onValue");
	QUnit.ok(p[canSymbol.for("can.onKeyValue")], "can.onKeyValue");
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
	}, 10);
});

QUnit.test("onKeyValue for promise-specific values", 3, function() {
	stop(3);
	var p = Promise.resolve("a");
	canReflectPromise(p);
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

QUnit.module("can-reflect-promise with jQuery.Deferred", {
	// $.Deferred isn't a prototype-enabled type, just an object
	//  that gets generated on demand, so no fancy setup is needed here.
});

QUnit.test("decorates promise", function() {
	var d = $.Deferred();
	QUnit.ok(!d[canSymbol.for("can.getKeyValue")], "no decoration");

	canReflectPromise(d);
	QUnit.ok(d[canSymbol.for("can.getKeyValue")], "has decoration");
	QUnit.ok(d.hasOwnProperty(canSymbol.for("can.getKeyValue")), "decoration strictly on object");
	QUnit.ok(!Object.prototype[canSymbol.for("can.getKeyValue")], "decoration not on proto");

});

QUnit.test("has all necessary symbols", function() {
	var d = new $.Deferred();
	canReflectPromise(d);
	QUnit.ok(d[canSymbol.for("can.getKeyValue")], "can.getKeyValue");
	QUnit.ok(d[canSymbol.for("can.getValue")], "can.getValue");
	QUnit.ok(d[canSymbol.for("can.onValue")], "can.onValue");
	QUnit.ok(d[canSymbol.for("can.onKeyValue")], "can.onKeyValue");
	QUnit.equal(d[canSymbol.for("can.isValueLike")], false, "can.isValueLike");

});

QUnit.test("getKeyValue for promise-specific values", 8, function() {
	var d = new $.Deferred();
	canReflectPromise(d);
	QUnit.equal(d[canSymbol.for("can.getKeyValue")]("isPending"), true, "isPending true in sync");
	QUnit.equal(d[canSymbol.for("can.getKeyValue")]("isResolved"), false, "isResolved false in sync");
	QUnit.equal(d[canSymbol.for("can.getKeyValue")]("value"), undefined, "no value in sync");
	QUnit.equal(d[canSymbol.for("can.getKeyValue")]("state"), "pending", "state pending in sync");
	stop();

	d.resolve("a"); // in some jQuery versions, resolving is sync
	setTimeout(function() {
		QUnit.equal(d[canSymbol.for("can.getKeyValue")]("value"), "a", "value in async");
		QUnit.equal(d[canSymbol.for("can.getKeyValue")]("isPending"), false, "isPending false in async");
		QUnit.equal(d[canSymbol.for("can.getKeyValue")]("isResolved"), true, "isResolved true in async");
		QUnit.equal(d[canSymbol.for("can.getKeyValue")]("state"), "resolved", "state resolved in async");
		start();
	}, 10);
});

QUnit.test("onKeyValue for promise-specific values", 4, function() {
	stop(4);
	var d = new $.Deferred();
	canReflectPromise(d);
	d[canSymbol.for("can.onKeyValue")]("value", function(newVal) {
		QUnit.equal(newVal, "a", "value updates on event");
		start();
	});
	d[canSymbol.for("can.onValue")](function(newVal) {
		QUnit.equal(newVal, "a", "value updates on event with onValue");
		start();
	});
	d[canSymbol.for("can.onKeyValue")]("isResolved", function(newVal) {
		QUnit.equal(newVal, true, "isResolved updates on event");
		start();
	});
	d[canSymbol.for("can.onKeyValue")]("state", function(newVal) {
		QUnit.equal(newVal, "resolved", "state updates on event");
		start();
	});
	d.resolve("a");
});

QUnit.test("getKeyValue on $.Deferred().promise()", 2, function() {
	var d = new $.Deferred();
	canReflectPromise(d);
	QUnit.equal(d.promise()[canSymbol.for("can.getKeyValue")]("value"), undefined, "no value in sync");
	stop();

	d.resolve("a"); // in some jQuery versions, resolving is sync
	setTimeout(function() {
		QUnit.equal(d.promise()[canSymbol.for("can.getKeyValue")]("value"), "a", "value in async");
		start();
	}, 10);
});
