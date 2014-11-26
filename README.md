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
    publicPath: "/dist", //the route which the dev considers to be the directory managed by webpack
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
      //where is the index.html located
      devIndex: "."
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

Config Options
==============

<ul>
	<li>compiler - the webpack compiler</li>
	<li>devIndex - path to the dev index.html file. Is ignored if devView is configured. defaults to index.html in the cwd</li>
	<li>devView</li>
</ul>
```javascript
{
	name: "the name of the view" // mandatory, elsewise the devIndex will be used
	data: "tplData" // an object, a function which gets passed in the request, or empty - data is supposed to determine tplData for the view
}

```
<ul>
	<li>
		quiet - turns off webpack compiler logging
	</li>
	<li>watchDelay - determines how frequently file changes are monitored</li>
	<li>headers - hash of headers to add to webpack-dev-server-plugin served files</li>
</ul>




