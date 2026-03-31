const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function override(config, env) {
  // Find the broken HtmlWebpackPlugin and replace its lodash usage
  config.plugins = config.plugins.map(plugin => {
    if (plugin.constructor.name === 'HtmlWebpackPlugin') {
      // We essentially tell the plugin to calm down and not use the broken lodash template
      return new HtmlWebpackPlugin({
        ...plugin.userOptions,
        templateContent: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
              <title>Recipe Wingman</title>
            </head>
            <body>
              <noscript>You need to enable JavaScript to run this app.</noscript>
              <div id="root"></div>
            </body>
          </html>
        `
      });
    }
    return plugin;
  });

  return config;
};