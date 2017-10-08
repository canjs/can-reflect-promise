var QUnit = require("steal-qunit");
var canSymbol = require("can-symbol");
var canReflectPromise = require("can-reflect-promise");
var $ = require("can-jquery");

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
	QUnit.ok(d[canSymbol.for("can.onKeyValue")], "can.onKeyValue");
	QUnit.ok(d[canSymbol.for("can.offKeyValue")], "can.offKeyValue");
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

QUnit.test("onKeyValue for promise-specific values", 3, function() {
	stop(3);
	var d = new $.Deferred();
	canReflectPromise(d);
	d[canSymbol.for("can.onKeyValue")]("value", function(newVal) {
		QUnit.equal(newVal, "a", "value updates on event");
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
