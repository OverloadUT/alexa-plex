/**
 * @module Plex
 */

"use strict";
var PlexAPI = require('plex-api');
var PlexPinAuth = require('plex-api-pinauth');

require('dotenv').load('../');

/**
 * The app config used in all Plex API requests for the X-Plex headers describing this app
 * @const
 * @type {{product: {String}, version: {String}, device: {String}, deviceName: {String}, identifier: {String}}}
 */
var PLEX_APP_CONFIG = {
    product: process.env.APP_PRODUCT,
    version: process.env.APP_VERSION,
    device: process.env.APP_DEVICE,
    deviceName: process.env.APP_DEVICE_NAME,
    identifier: process.env.APP_IDENTIFIER
};

/**
 * Creates a new Plex object, which handles the stateful objects from the plex-api library
 * @constructor Plex
 * @classdesc A container for the multiple stateful plex-api objects needed for the app
 */
var Plex = function(app) {
    var context = this;

    /**
     * The App object for this specific request
     * @private
     * @member {module:App~App}
     */
    this._app = app;

    /**
     * The stateful PlexPinAuth object that provides handy PIN auth functions
     * @member {PlexPinAuth}
     */
    this.pinAuth = new PlexPinAuth();

    /**
     * @private
     * @member {?PlexAPI}
     */
    this._pms = null;
    /**
     * @private
     * @member {?PlexAPI}
     */
    this._web = null;
    this.initializeWebApi();

    /**
     * @type {PlexAPI}
     * @name module:Plex~Plex#pms
     * @memberof module:Plex~Plex
     */
    Object.defineProperty(this, 'pms', {
        get: function() {
            if(!context._pms) {
                if(!context.initializeServerApi()) {
                    throw new ReferenceError("Tried to access Plex.pms before it has been initialized");
                }
            }
            return context._pms;
        }
    });

    /**
     * @type {PlexAPI}
     * @name module:Plex~Plex#web
     * @memberof module:Plex~Plex
     */
    Object.defineProperty(this, 'web', {
        get: function() {
            if(!context._pms) {
                if(!context.initializeWebApi()) {
                    throw new ReferenceError("Tried to access Plex.web before it has been initialized");
                }
            }
            return context._web;
        }
    });
};

/**
 * Initializes the "web" instance of the Plex API
 * @returns {Boolean} true if creation of the API object was successful
 */
Plex.prototype.initializeWebApi = function() {
    this._web = new PlexAPI({
        hostname: 'plex.tv',
        port: 443,
        https: true,
        authenticator: this.pinAuth,
        options: PLEX_APP_CONFIG
    });

    return true;
};

/**
 * Initializes the "server" instance of the Plex API
 * The user must have a server configured or the creation will fail
 * @returns {Boolean} true if creation of the API object was successful
 */
Plex.prototype.initializeServerApi = function() {
    var app = this._app;

    if(!app.user.server) {
        return false;
    }

    this._pms = new PlexAPI({
        hostname: app.user.hostname,
        port: app.user.port,
        https: app.user.https,
        authenticator: this.pinAuth,
        options: PLEX_APP_CONFIG
    });

    return true;
};

/**
 * Sets the auth token to be used on all future API calls
 * @param {String} authtoken - The auth token
 */
Plex.prototype.setAuthToken = function(authtoken) {
    this.pinAuth.token = authtoken;
};

module.exports = {
    Plex: Plex
};