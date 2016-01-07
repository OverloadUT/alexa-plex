var common = require('./common');
var plexutils = require('./plexutils');
var Q = require('q');
var url = require('url');
var db = require('./db');

var User = function(dbobject) {
    this.dbobject = dbobject;

    // TODO I am not sure if I like this whole defineProperty stuff. Mostly here to experiment.
    // Some of these will require some async stuff so it'll all need to be converted to Promise functions

    var context = this;
    Object.defineProperty(this, 'authtoken', {
        get: function() {
            return context.dbobject.authtoken;
        },
        set: function(token) {
            context.dbobject.authtoken = token;
        }
    });

    Object.defineProperty(this, 'server', {
        get: function() {
            return context.dbobject.server;
        }
    });

    Object.defineProperty(this, 'serverName', {
        get: function() {
            if (!context.dbobject.server) {
                throw new Error("Trying to get serverName with no pms on the user record");
            }

            return context.dbobject.server.attributes.name;
        }
    });

    Object.defineProperty(this, 'hostname', {
        get: function() {
            if (!context.dbobject.server) {
                throw new Error("Trying to get hostname with no pms on the user record");
            }

            var connection = context.dbobject.server.Connection.filter(function(connection) {
                return connection.attributes.local == "0";
            })[0];

            var uri = url.parse(connection.attributes.uri);
            return uri.hostname;
        }
    });

    Object.defineProperty(this, 'port', {
        get: function() {
            if (!context.dbobject.server) {
                throw new Error("Trying to get port with no pms on the user record");
            }

            var connection = context.dbobject.server.Connection.filter(function(connection) {
                return connection.attributes.local == "0";
            })[0];

            var uri = url.parse(connection.attributes.uri);
            return uri.port;
        }
    });

    Object.defineProperty(this, 'https', {
        get: function() {
            if (!context.dbobject.server) {
                throw new Error("Trying to get https with no pms on the user record");
            }

            var connection = context.dbobject.server.Connection.filter(function(connection) {
                return connection.attributes.local == "0";
            })[0];

            var uri = url.parse(connection.attributes.uri);
            return (uri.protocol == 'https:');
        }
    });

    Object.defineProperty(this, 'player', {
        get: function() {
            return context.dbobject.player;
        }
    });

    Object.defineProperty(this, 'playerName', {
        get: function() {
            return context.dbobject.player.name;
        }
    });

    Object.defineProperty(this, 'pin', {
        get: function() {
            return context.dbobject.pin;
        }
    });
};

/**
 * Sets the user's server to the first one in their account if they didn't have a server already set
 * @param {boolean} forceReset - forces the server to be reset even if they already had one
 * @returns {Promise.bool} Resolves with bool representing whether or not an update was made
 */
User.prototype.setDefaultServer = function(forceReset) {
    var context = this;
    if (!this.server || forceReset) {
        return plexutils.getServers()
            .then(function(servers) {
                return db.updateUserServer(context, servers[0])
                    .then(function() {
                        return true;
                    })
        })
    }

    return Q.resolve(false);
};

/**
 * Sets the user's player to the first one in their account if they didn't have a player already set
 * @param {boolean} forceReset - forces the player to be reset even if they already had one
 * @returns {Promise.bool} Resolves with bool representing whether or not an update was made
 */
User.prototype.setDefaultPlayer = function(forceReset) {
    var context = this;
    if (!this.player || forceReset) {
        return plexutils.getPlayers()
            .then(function(players) {
                return db.updateUserPlayer(context, players[0])
                    .then(function() {
                        return true;
                    })
        })
    }

    return Q.resolve(false);
};

/**
 * Sets the user's server and player if none are already set
 * @param {boolean} [forceReset=false] - forces a refresh from the account
 * @returns {Promise} Resolves when all API and DB calls are done
 */
User.prototype.setupDefaults = function(forceReset) {
    var context = this;
    return this.setDefaultServer(forceReset)
        .then(function(serverUpdated) {
            if(serverUpdated) {
                // TODO this is messy as all hell. Fix it :(
                plexutils.initPlexAPI();
            }
            // We want to force update the player if the server changed
            return context.setDefaultPlayer(forceReset || serverUpdated);
        });
};

module.exports = User;