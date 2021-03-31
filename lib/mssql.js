/* global module, require, exports */

(function() {
  'use strict';

  var
    logger = require('log4js').getLogger('mssql'),
    fs = require('fs'),
    settings,
    auth = {options: {}}
    ;

  exports.init = function(config) {

    settings = config;
    auth.options.username = process.env.USERNAME;
    auth.options.password = process.env.PASSWORD;

    logger.info('initialized with login');

    return auth.options;

  };

}());