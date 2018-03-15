var conf = require('./src/controllers/conf.js');
var StringReplacePlugin = require('string-replace-webpack-plugin');
var path = require('path');

var controllerPaths = {
  UAS: './controllers/uas.js',
  DFP: './controllers/gpt.js'
};

module.exports = {
  devtool: 'source-map',
  resolve: {
    modules: [path.resolve('./node_modules'), path.resolve('./src_new')]
  },
  output: {
    filename: 'controller.js'
  },
  resolveLoader: {
    modules: ['node_modules']
  },
  module: {
    rules: [
      {
        test: /owt.js$/,
        include: /(src\/controllers)/,
        loader: StringReplacePlugin.replace({
          replacements: [
            {
              pattern: /%%PATH_TO_CONTROLLER%%/g,
              replacement: function (match, p1, offset, string) {
                return controllerPaths[conf.pwt.adserver || 'DFP'];
              }
            }
          ]
        })
      },
      {
        test: /\.js$/,
        exclude: path.resolve('./node_modules'), // required to prevent loader from choking non-Prebid.js node_modules
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['es2015']
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new StringReplacePlugin()
  ]
};
