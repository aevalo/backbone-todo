'use strict'

const webpackMerge = require('webpack-merge')
const UglifyJsPlugin = require('webpack/lib/optimize/UglifyJsPlugin')

const commonConfig = require('./webpack.common.config.js');

module.exports = webpackMerge(commonConfig.data, {
  plugins: [
    new UglifyJsPlugin({
      minimize: true,
      sourceMap: false,
      compress: {
        drop_console: true,
        drop_debugger: true,
        warnings: false
      },
      comments: false,
      beautify: false,
      mangle: false
    })
  ]
})

