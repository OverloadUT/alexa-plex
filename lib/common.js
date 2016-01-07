require('dotenv').load('../');

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

    // TODO I don't like this - it's just globals right? I'm a monster :(
    // These all get set in the states' setup() functions
    plex: null,
    plexTV: null,
    pinAuth: null,

    plexOptions: plexOptions,

    /** {alexa} */
    app: null,
    CONFIDICE_CONFIRM_THRESHOLD: 0.4
};

module.exports = common;