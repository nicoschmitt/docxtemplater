"use strict";

const {setExamplesDirectory, setStartFunction, start} = require("./utils");
const path = require("path");
setExamplesDirectory(path.resolve(__dirname, "..", "..", "examples"));
setStartFunction(startTest);

function startTest() {
	require("./base");
	require("./xml-templater");
	require("./xml-matcher");
	require("./errors");
	require("./speed");
	require("./lexer-parser-render");
	require("./integration");
	require("./doc-props");

	if (typeof window !== "undefined" && window) {
		return window.mocha.run();
	}
}

start();
