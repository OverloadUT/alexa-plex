/**
 * @module User
 */

var plexutils = require('./plexutils');
var Q = require('q');
var url = require('url');
var db = require('./db');

/**
 * @constructor User
 * @param {Object} dbobject - an object representing exactly what is in the database for this user
 */
var User = function(app, dbobject) {
    this.dbobject = dbobject;

    /**
     * The App object for this specific request
     * @private
     * @member {module:App~App}
     */
    this._app = app;

    var context = this;
    Object.defineProperty(this, 'authtoken', {
        get: function() {
            return context.dbobject.authtoken;
        },
        set: function(token) {
            context.dbobject.authtoken = token;
        }
    });

    Object.defineProperty(this, 'libraries', {
        get: function() {
            return context.dbobject.libraries;
        }
    });

    Object.defineProperty(this, 'MovieLibrary', {
        get: function() {
            if (!context.dbobject.libraries) {
                throw new Error("Trying to get MovieLibrary with no libraries on the user record");
            }

            var libraries = context.dbobject.libraries.filter(function(library) {
                return library.type == "movie";
            });

            // For now we're going to sort by key, which more or less gives us a sort by creation date.
            libraries.sort(function(a, b) {
                return Number(a.key) - Number(b.key);
            });

            return libraries[0];
        }
    });

    Object.defineProperty(this, 'TVLibrary', {
        get: function() {
            if (!context.dbobject.libraries) {
                throw new Error("Trying to get TVLirary with no libraries on the user record");
            }

            var libraries = context.dbobject.libraries.filter(function(library) {
                return library.type == "show";
            });

            // For now we're going to sort by key, which more or less gives us a sort by creation date.
            libraries.sort(function(a, b) {
                return Number(a.key) - Number(b.key);
            });

            return libraries[0];
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

    Object.defineProperty(this, 'serverIdentifier', {
        get: function() {
            return context.dbobject.server.attributes.clientIdentifier;
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

    Object.defineProperty(this, 'playerURI', {
        get: function() {
            return context.dbobject.player.uri;
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
 * @returns {Promise.boolean} Resolves with bool representing whether or not an update was made
 */
User.prototype.setDefaultServer = function(forceReset) {
    var context = this;
    if (!this.server || forceReset) {
        return plexutils.getServers(context._app)
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
 * Retrieves the list of "Directories" on the server and caches them in the database
 * so we can save ourselves an API call on every future request.
 * @param {boolean} forceReset - forces the update even if we already had this in the database
 * @returns {Promise.boolean} Resolves with bool representing whether or not an update was made
 */
User.prototype.cacheServerLibraries = function(forceReset) {
    var context = this;
    if (!this.libraries || forceReset) {
        return plexutils.getLibrarySections(context._app)
            .then(function(directories) {
                return db.updateUserLibraries(context, directories._children)
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
 * @returns {Promise.boolean} Resolves with bool representing whether or not an update was made
 */
User.prototype.setDefaultPlayer = function(forceReset) {
    var context = this;
    if (!this.player || forceReset) {
        return plexutils.getPlayers(context._app)
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
 * @returns {Promise.boolean} Resolves when all API and DB calls are done with whether or not any updates were made
 */
User.prototype.setupDefaults = function(forceReset) {
    var context = this;
    return this.setDefaultServer(forceReset)
        .then(function(serverUpdated) {
            // We want to force update the player if the server changed
            return context.setDefaultPlayer(forceReset || serverUpdated)
                .then(function() {
                    return context.cacheServerLibraries(forceReset || serverUpdated);
                });
        });
};

module.exports = {
    User: User
};