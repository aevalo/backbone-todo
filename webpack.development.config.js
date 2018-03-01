'use strict'

const webpackMerge = require('webpack-merge')

const commonConfig = require('./webpack.common.config.js')

module.exports = webpackMerge(commonConfig.data, {
  devtool: 'eval-source-map',
  plugins: [],
  module: {
    rules: []
  }
})

