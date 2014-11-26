var fs = require('fs');
var chai = require('chai');
var spies = require('chai-spies');
chai.use(spies);
var Hapi = require('hapi');
var Wreck = require('wreck');
var path = require("path");
var Webpack = require('webpack');

var expect = chai.expect;
var gutil = require('gulp-util');

describe("Hapi Weback-Dev Plugin Test", function () {
	var server;
	var port = 8337;
	var address = 'localhost';
	var currDone = null;
	var compiler;

	var url = function (path) {
		return ["http://", address, ":", port, path].join("")
	};


	// <SETUP> ///////////////////////////////////////
	beforeEach(function (done) {
		server = new Hapi.Server({
			debug: {
				//request: ["error"]
			}
		});
		server.connection({
			port: port,
			host: address
		});

		server.route({
			method: "*",
			path: "/",
			handler: function (request, reply) {
				reply("ok").code(200);
			}
		});

		//configure the webpack compiler to work with our dummy test app
		var webPackConfig = {
			cache: true,
			devtool: "eval",
			debug: true,
			entry: {
				entry: "./test/data/entry.js"
			},
			output: {
				path: __dirname + "/dist", //the basic build directory
				publicPath: "/dist", //the route which the dev server listens for
				filename: "[name].js",
				chunkFilename: "[chunkhash].[id].js"
			}
		};

		compiler = Webpack(webPackConfig);


		server.start(function () {
			server.register({
				register: require('./../../src/plugin'),
				options: {
					compiler: compiler,
					//no loginfo
					quiet: true,
					devIndex: "./test/data"
					/*
					,watchDelay: 200
					,noInfo: false
					,headers: {
						x-dynamic-content: true
					}
					*/
				}
			}, function (err) {
				expect(err).to.not.exist;
				done();
			});
		});

		var apiTestPlugin = function (plugin, options, next) {
			plugin.route({
				method: '*',
				path: '/api/test',
				handler: function (request, reply) {
					reply(options.message);
				}
			});
			next();
		};

		apiTestPlugin.attributes = {
			version: "0.0.0",
			name: "test"
		};

		server.register({
			register: apiTestPlugin,
			options: {
				message: 'testApi Response'
			}
		}, function (err) {
			if (err) {
				console.log('Failed loading plugin');
			}
		});
	});

	afterEach(function (done) {
		server.stop(function () {
			var err = fs.writeFileSync("./test/data/entry.js",'console.log("test");');
			if(err) {
				console-log("clean up failed");
			}
			done();
		});
	});
	// </SETUP> ///////////////////////////////////////


	// <TESTS> ///////////////////////////////////////
	it("should intercept requests", function (done) {
		Wreck.get(url("/dist/entry.js"), function (err, res, payload) {
			expect(res.headers["x-hapi-webpack-dev"]).to.exist;
			expect(res.headers["x-hapi-webpack-dev"]).to.equal("true");
			done();
		});
	});


	it("should notice a change in webpack relevant files", function (done) {
		compiler.plugin("done", function () {
			done();
		});
		fs.appendFile("./test/data/entry.js", "console.log('test');", function (err) {
			if (err) {
				throw "could not edit entry.js file" + err;
			}
		});
	});

	it("should deliver root html", function (done) {
		Wreck.get(url("/index.html"), function (err, res, payload) {
			expect(res.statusCode).to.equal(200);
			done();
		});
	});

	it("should redirect to host app", function (done) {
		Wreck.get(url("/webpack-dev-server"), function (err, res, payload) {
			expect(res.statusCode).to.equal(302);
			done();
		});
	});

	it("should serve the bundle js file", function (done) {
		Wreck.get(url("/__webpack_dev_server__/live.bundle.js"), function (err, res, payload) {
			expect(res.statusCode).to.equal(200);
			done();
		});
	});

	it("should serve the webpackdevserver frontend js file", function (done) {
		Wreck.get(url("/webpack-dev-server.js"), function (err, res, payload) {
			expect(res.statusCode).to.equal(200);
			done();
		});
	});

	it("should serve dynamic content from the memory filesystem", function (done) {
		Wreck.get(url("/dist/entry.js"), function (err, res, payload) {
			expect(res.statusCode).to.equal(200);
			done();
		});
	});

	it("should serve an error for unknown files", function (done) {
		Wreck.get(url("/dist/entry_undefined.js"), function (err, res, payload) {
			expect(res.statusCode).to.equal(404);
			done();
		});
	});

	it("should handle routes correctly", function (done) {
		Wreck.get(url("/api/test"), function (err, res, payload) {
			expect(res.statusCode).to.equal(200);
			Wreck.post(url("/api/test"), function (err, res, payload) {
				expect(res.statusCode).to.equal(200);
				done();
			});
		});
	});
	// </TESTS> ///////////////////////////////////////
});