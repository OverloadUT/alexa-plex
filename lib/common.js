

var alexa = require('alexa-app');
var app = new alexa.app('plex');

var common = {
    plex: null, // This will get set by index.js
    pinAuth: null, // This will get set by index.js
    app: app,
    CONFIDICE_CONFIRM_THRESHOLD: 0.4
};

module.exports = common;