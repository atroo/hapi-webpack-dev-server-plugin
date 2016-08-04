hapi-webpack-dev-server-plugin
==============================

This is a plugin for hapijs providing the necessary routes to function as a webpack-dev-server for the [awesome webpack project](http://webpack.github.io/) directly in hapijs. The actual [Webpack-dev-server](https://github.com/webpack/webpack-dev-server) is implemented with express.js and since we are heavily using the fabulous [hapijs](http://hapijs.com/) as our main backend framework we found it very useful to have everything right there. This avoids tweaking SOP related things just for dev purposes.

Just like the original webpack-dev-server we also want to give out a quick warning: 

*DON'T USE THIS PLUGIN IN PRODUCTION!*

*>= v1.1.2 -> Requirements: hapijs ^14.x.x*
*<= v1.1.2 -> Requirements: hapijs ^8.x.x*

State: In Progress (meaning not hot code replacement at the moment, but auto relaoding works just fine)

Basic Usage
=====

we tend to structure our apps like
```javascript
- server_plugin
    index.js
- webpack_frontend
    - src
        main.js
    webpack.config.js
server.js
```

with that structure in mind you'd setup the dev-server-plugin in the server.js as follows

```javascript
var Webpack = require('webpack');
var Hapi = require('hapi');

//basic webpack config, see webpack api docs for all options
var webpackConf = require('./webpack_frontend/webpack.config.js');
webpackConf.entry = {
    app: './webpack_frontend/src/main.js' //this is needed to have the correct relative paths for the webpack compiler which now runs from the base dir rather than from webpack_frontend
};
webpackConf.devtool = 'source-map';

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
    register: require('hapi-webpack-dev-plugin'),
    options: {
      compiler: compiler,
      //no loginfo
      quiet: true,
      //where is the index.html located
      devIndex: ".", //not needed if devView is configured
      devView: { //allows to configure a view with whatever engine hapi has been configured to induce e.e. session information on startup
            name: 'main.html',
            data: function (request) {
                var tplData = {
                    "entrypoint": "dist/app.js"
                };
                return tplData;
            }
        }
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


Questions?
==============

Feel free to ask questions if anything is badly described!

info@atroo.de or an Issue!


