const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const webpack = require('webpack');
const extractSASS = new ExtractTextPlugin({ filename: 'css/todo.css' });

module.exports = {
    data: {
        entry: {
            todo: './src/todo.js'
        },
        output: {
            filename: 'js/[name].bundle.js',
            path: path.join(__dirname, '/src/')
        },
        cache: true,
        resolve: {
            unsafeCache: true
        },
        module: {
            rules: [
                {
                    test: /\.scss$/,
                    exclude: /node_modules/,
                    use: extractSASS.extract({
                        fallback: 'style-loader',
                        use: [
                            {loader: 'css-loader?importloaders=2&sourceMap=true'},
                            {loader: 'postcss-loader'},
                            {loader: 'sass-loader?sourceMap=true'}
                        ],
                        publicPath: '../'
                    })
                },
                {
                    test: /\.svg(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    include: /flags/,
                    loader: 'file-loader?name=' + path.join('images/flags', '[name].[ext]')
                },
                {
                    test: /\.(ttf|eot|svg|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                    exclude: /flags/,
                    loader: 'file-loader?name=' + path.join('fonts', '[name].[ext]')
                }
            ]
        },
        plugins: [
            extractSASS,
            new webpack.ProvidePlugin({
                $: 'jquery',
                _: 'underscore'
            })
        ]
    }
};

