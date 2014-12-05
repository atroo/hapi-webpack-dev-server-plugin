/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
	
	This is an adaptation of sokras great webpack-dev-middle-ware for webpacks compiler state managment as well as default routing working for express as a middleware
	This adapation will do a comparable thing for Hapi in context of beeing integrated in a hapi plugin
	
	Author Robert Krüger +de.robat
*/

var path = require("path");
var MemoryFileSystem = require("memory-fs");
var mime = require("mime");
var Boom = require("boom");

// constructor for the middlewa
module.exports = function (options) {
	var compiler = options.compiler;
	if (options.watchDelay === undefined) options.watchDelay = 200;
	if (typeof options.stats === "undefined") options.stats = {};
	if (!options.stats.context) options.stats.context = process.cwd();

	// store our files in memory
	var files = {};
	var fs = compiler.outputFileSystem = new MemoryFileSystem();

	compiler.plugin("done", function (stats) {
		// We are now on valid state
		state = true;
		// Do the stuff in nextTick, because bundle may be invalidated
		//  if a change happend while compiling
		process.nextTick(function () {
			// check if still in valid state
			if (!state) return;
			// print webpack output
			var displayStats = (!options.quiet && options.stats !== false);
			if (displayStats &&
				!(stats.hasErrors() || stats.hasWarnings()) &&
				options.noInfo)
				displayStats = false;
			if (displayStats) {
				console.log(stats.toString(options.stats));
			}
			if (!options.noInfo && !options.quiet)
				console.info("webpack: bundle is now VALID.");

			// execute callback that are delayed
			var cbs = callbacks;
			callbacks = [];
			cbs.forEach(function continueBecauseBundleAvailible(cb) {
				cb();
			});
		});

		if (forceRebuild) {
			forceRebuild = false;
			rebuild();
		}
	});

	// on compiling
	function invalidPlugin() {
		if (state && (!options.noInfo && !options.quiet))
			console.info("webpack: bundle is now INVALID.");
		// We are now in invalid state
		state = false;
	}
	compiler.plugin("invalid", invalidPlugin);
	compiler.plugin("compile", invalidPlugin);

	// the state, false: bundle invalid, true: bundle valid
	var state = false;

	var forceRebuild = false;

	// delayed callback
	var callbacks = [];

	// wait for bundle valid
	function ready(fn, url) {
		if (state) return fn();
		if (!options.noInfo && !options.quiet)
			console.log("webpack: wait until bundle finished: " + url);
		callbacks.push(fn);
	}

	var watching = compiler.watch(options.watchDelay, function (err) {
		if (err) throw err;
	});

	function rebuild() {
		if (state) {
			state = false;
			compiler.run(function (err) {
				if (err) throw err;
			});
		} else {
			forceRebuild = true;
		}
	}

	function pathJoin(a, b) {
		return a == "/" ? "/" + b : (a || "") + "/" + b
	}

	function getFilenameFromUrl(url) {
		// publicPrefix is the folder our bundle should be in
		var localPrefix = compiler.options.output.publicPath || "/";
		if(localPrefix[0] != "/"){
			//the route always starts with a slash even when the publicPath doesnt
			localPrefix = "/" + localPrefix;
		}
		if (url.indexOf(localPrefix) !== 0) {
			if (/^(https?:)?\/\//.test(localPrefix)) {
				localPrefix = "/" + localPrefix.replace(/^(https?:)?\/\/[^\/]+\//, "");
				// fast exit if another directory requested
				if (url.indexOf(localPrefix) !== 0) return false;
			} else return false;
		}
		// get filename from request
		var filename = url.substr(localPrefix.length);
		if (filename.indexOf("?") >= 0) {
			filename = filename.substr(0, filename.indexOf("?"));
		}
		return filename ? pathJoin(compiler.outputPath, filename) : compiler.outputPath;
	}

	function beforeRequest(req, reply) {
		var filename = getFilenameFromUrl(req.url.path);
		if (filename === false) return reply.continue();

		// delay the request until we have a vaild bundle
		ready(function () {
			try {
				var stat = fs.statSync(filename);
				if (!stat.isFile()) {
					if (stat.isDirectory()) {
						filename = path.join(filename, "index.html");
						stat = fs.statSync(filename);
						if (!stat.isFile()) throw "next";
					} else {
						throw "next";
					}
				}
			} catch (e) {
				return reply.continue();
			}

			//reply with a file from the mem fs
			var content = fs.readFileSync(filename);
			var res = reply(content);

			res.header("Access-Control-Allow-Origin", "*"); // To support XHR, etc.
			res.header("x-hapi-webpack-dev", "true"); // allow for unittests
			res.header("Content-Type", mime.lookup(filename));

			if (options.headers) {
				for (var name in options.headers) {
					res.header(name, options.headers[name]);
				}
			};
		}, filename);
	};

	return {
		beforeRequest: beforeRequest,
		getFilenameFromUrl: getFilenameFromUrl,
		invalidate: function () {
			if (watching) watching.invalidate();
		},
		close: function (callback) {
			callback = callback || function () {};
			if (watching) watching.close(callback);
			else callback();
		},
		fileSystem: fs
	};
}