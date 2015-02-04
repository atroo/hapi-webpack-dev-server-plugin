/**
 * http://opensource.org/licenses/mit-license.php
 * Author Tobias koppers
 *
 * This is an adaptation of the great work of Tobias Koppers to allow for a HapiJS Server to work as a webpack-dev-server by the help of this plugin as well
 *
 * Author Robert Krüger +de.robat www.atroo.de
 */

var fs = require("fs");
var path = require("path");
var PluginUtil = require("./pluginutil");
var mime = require("mime");
var Boom = require("boom");

var compiler,
    io,
    pluginUtil,
    pluginDevOptions,
    options,
    _stats,
    devIndex;

//before each request make sure that the webpack compiler is in a acceptable state (at least if we have to server files)
function runPreHandlerInterceptor(req, reply) {
    try {
        pluginUtil.beforeRequest(req, reply);
    } catch (e) {
        console.error("PreHandler Fault: ", e);
        reply(e);
    }
};

function sendStats(socket, stats, force) {
    if (!force && stats && stats.assets && stats.assets.every(function (asset) {
            return !asset.emitted;
        })) return;
    socket.emit("hash", stats.hash);
    if (stats.errors.length > 0)
        socket.emit("errors", stats.errors);
    else if (stats.warnings.length > 0)
        socket.emit("warnings", stats.warnings);
    else
        socket.emit("ok");
}

function serveMagicHtml(req, reply) {
    var _path = req.path;
    try {
        if (!pluginUtil.fileSystem.statSync(pluginUtil.getFilenameFromUrl(_path + ".js")).isFile())
            return false;
        // Serve a page that executes the javascript
        var res = '<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><script type="text/javascript" charset="utf-8" src="';
        res += _path;
        res += '.js';
        res += req._parsedUrl.search || "";
        res += '"></script></body></html>';
        reply(res);
        return true;
    } catch (e) {
        return false
    }
}


/**
 * setup all the necessities for the plugin to work
 */
exports.register = function (server, opts, next) {
    if (opts && opts.compiler) {

        //general options beeing presented to the whole plugin
        options = opts;

        devIndex = opts.devIndex || ".";
        //the webpack compiler object to work with
        compiler = opts.compiler;

        pluginUtil = PluginUtil(opts);
        server.ext("onPreHandler", runPreHandlerInterceptor);

        //if the pack halts, stop the compilers watching task
        server.on("stop", function () {
            //close down the watch task of the middleware
            pluginUtil.close();
        });

        var invalidPlugin = function () {
            if (io) io.sockets.emit("invalid");
        }.bind(this);
        compiler.plugin("compile", invalidPlugin);
        compiler.plugin("invalid", invalidPlugin);
        compiler.plugin("done", function (stats) {
            if (!io) return;
            sendStats(io.sockets, stats.toJson());
            _stats = stats;
        }.bind(this));

        //configure some standard routes which are involved in the startup process
        //the js file to build the hosting iframe
        server.route({
            method: "GET",
            path: "/__webpack_dev_server__/live.bundle.js",
            config: {
                auth: false,
                handler: function (req, reply) {
                    reply(fs.createReadStream(path.join(__dirname, "..", "client", "live.bundle.js"))).header("Content-Type", "application/javascript");;
                }
            }
        });

        server.route({
            method: "GET",
            path: "/webpack-dev-server.js",
            config: {
                auth: false,
                handler: function (req, reply) {
                    reply(fs.createReadStream(path.join(__dirname, "..", "client", "index.bundle.js"))).header("Content-Type", "application/javascript");
                }
            }
        });

        //the html requesting the live.bundle.js
        server.route({
            method: "GET",
            path: "/webpack-dev-server/{anything*}",
            config: {
                auth: false,
                handler: function (req, reply) {
                    reply(fs.createReadStream(path.join(__dirname, "..", "client", "live.html"))).header("Content-Type", "text/html");
                }
            }
        });

        //the html requesting the live.bundle.js
        server.route({
            method: "GET",
            path: "/index.html",
            config: {
                auth: false,
                handler: function (req, reply) {
                    if (options.devView && options.devView.name) {
                        var data = typeof (options.devView.data) == "function" ? options.devView.data(req) : options.devView.data || {};
                        reply.view(options.devView.name, data);
                    } else {
                        reply.file(path.join(devIndex, "index.html"));
                    }
                }
            }
        });

        //a listing of whats contained in the dev server
        server.route({
            method: "GET",
            path: "/webpack-dev-server",
            config: {
                auth: false,
                handler: function (req, reply) {
                    reply.redirect("webpack-dev-server/index.html");
                }
            }
        });

        //register socketio to listen to any server in the pack
        var socketIO = require('socket.io');
        server.connections.forEach(function (srv) {
            io = socketIO.listen(srv.listener, {
                serveClient: false,
                path: '/webpackdevserversocket',
                log: false
            });
            io.set('transports', ['websocket']);
            io.sockets.on("connection", function (socket) {
                if (!_stats) {
                    return;
                }
                sendStats(socket, _stats.toJson(), true);
            }.bind(this));
        });

        next();
    } else {
        next("unsufficient options parameter for hapiWebpackDev Plugin. A Webpack Compiler object is needed!");
    }
};

exports.register.attributes = {
    pkg: require('./../package.json')
};