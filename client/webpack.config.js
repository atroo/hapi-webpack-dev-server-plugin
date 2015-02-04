var path = require("path");
var webpack = require("webpack");

module.exports = {
    entry: {
        index: "./index",
        live: "./live",
    },
    output: {
        path: path.join(__dirname, ""),
        filename: "[name].bundle.js",
        chunkFilename: "[chunkhash].[id].js"
    },
    module: {
        loaders: [{
                test: /\.css/,
                loader: "style-loader!css-loader"
            },
            {
                test: /\.jade$/,
                loader: "jade?self"
            }
  ]
    }
}