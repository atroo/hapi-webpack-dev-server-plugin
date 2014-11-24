hapi-webpack-dev-server-plugin
==============================

This is a plugin for hapijs providing the necessary routes to function as a webpack-dev-server for the [awesome webpack project](http://webpack.github.io/) directly in hapijs. The actual [Webpack-dev-server](https://github.com/webpack/webpack-dev-server) is implemented with express.js and since we are heavily using hapijs as our main backend framework we found it very useful to have everything out of the box.

Requirements: hapijs ^8.x.x

State: In Progress

Basic Usage
=====

```javascript
var Webpack = require('webpack');
var Hapi = require('hapi');

//basic webpack config, see webpack api docs for all options
var webPackConfig = {
  cache: true,
  devtool: "eval",
  debug: true,
  entry: {
    entry: "./dist/entry.js"
  },
  output: {
    path: __dirname + "/dist", //the basic build directory
    publicPath: "/dist", //the route which the dev server listens for
    filename: "[name].js",
    chunkFilename: "[chunkhash].[id].js"
  }
};
//create the webpack compiler
compiler = Webpack(webPackConfig);

//create hapi server
server = new Hapi.Server();
server.connection({
	port: port,
	host: address
});

//start server and register dev server as plugin
server.start(function () {
  server.register({
    register: require('./src/plugin'),
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
      console.log(err);
  });
});

```
