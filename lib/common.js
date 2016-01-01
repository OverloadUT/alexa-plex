require('dotenv').load('../');
var alexa = require('alexa-app');
var app = new alexa.app('plex');

var plexOptions = {
    product: process.env.APP_PRODUCT,
    version: process.env.APP_VERSION,
    device: process.env.APP_DEVICE,
    deviceName: process.env.APP_DEVICE_NAME,
    identifier: process.env.APP_IDENTIFIER
};

var common = {
    // HACK this is a horrible hack to make proxyquire work well in the unit tests. :(
    PlexAPI: null, // This gets set by index.js to require('plex-api')
    PlexPinAuth: null, // This gets set by index.js to require('plex-api-pinauth')
    plex: null, // This will get set by index.js
    pinAuth: null, // This will get set by index.js

    plexOptions: plexOptions,

    app: app,
    CONFIDICE_CONFIRM_THRESHOLD: 0.4
};

module.exports = common;