var proxyquire = require('proxyquire');
var sinon = require('sinon');

module.exports.plexAPIStubFramework = function() {
    before('Set up plex api stubbing', function() {
        var context = this;

        this.plexAPIStubs = {
            query: function () {throw new Error("This placeholder proxyquire function should never get called")},
            postQuery: function () {throw new Error("This placeholder proxyquire function should never get called")},
            perform: function () {throw new Error("This placeholder proxyquire function should never get called")},
            find: function () {throw new Error("This placeholder proxyquire function should never get called")}
        };

        this.restoreAllStubs = function() {
            this.plexAPIStubs.query.restore();
            this.plexAPIStubs.postQuery.restore();
            this.plexAPIStubs.perform.restore();
            this.plexAPIStubs.find.restore();
        };

        this.plexAPIStubConstructor = function (opts) {
            console.log("Constructing Plex API", opts);
            this.query = context.plexAPIStubs.query;
            this.postQuery = context.plexAPIStubs.postQuery;
            this.perform = context.plexAPIStubs.perform;
            this.find = context.plexAPIStubs.find;
            this.getIdentifier = sinon.stub().returns('STUBBED-IDENTIFIER');
        };

        if(process.env.NODE_ENV === 'test') {
            this.lambda = proxyquire('../index.js', {
                'plex-api': this.plexAPIStubConstructor
            });
        } else if (process.env.NODE_ENV === 'test-live'){
            this.lambda = require('../index.js');
            this.plexAPIStubConstructor();
        }
    });

    beforeEach('set up main module with stubs for all plex-api methods', function () {
        console.log("Setting up all stubs")
        sinon.stub(this.plexAPIStubs, 'query').rejects(new Error('Unhandled URI in postQuery stub'));
        sinon.stub(this.plexAPIStubs, 'postQuery').rejects(new Error('Unhandled URI in postQuery stub'));
        sinon.stub(this.plexAPIStubs, 'perform').rejects(new Error('Unhandled URI in perform stub'));
        sinon.stub(this.plexAPIStubs, 'find').rejects(new Error('Unhandled URI in find stub'));

        this.plexAPIStubs.query.withArgs('/')
            .resolves(require('./samples/root.json'));
        this.plexAPIStubs.query.withArgs(sinon.match(/\/library\/metadata\/[0-9]+$/))
            .resolves(require('./samples/library_metadata_item.json'));
        this.plexAPIStubs.query.withArgs('/library/sections/1/all')
            .resolves(require('./samples/library_section_allshows.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/1/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_withunwatched.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/259/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_withunwatched_withpartial.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/143/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_allwatched.json'));
        this.plexAPIStubs.query.withArgs('/library/metadata/298/allLeaves')
            .resolves(require('./samples/library_metadata_showepisodes_allwatched_withpartial.json'));

        this.plexAPIStubs.postQuery.withArgs(sinon.match(/\/playQueues/))
            .resolves(require('./samples/playqueues.json'));

        this.plexAPIStubs.perform.withArgs(sinon.match(/\/playMedia/))
            .resolves();

        this.plexAPIStubs.find.withArgs('/clients')
            .resolves(require('./samples/clients.json'));
    });

    afterEach('Restore all plex-api stubs to blank methods', function() {
        this.restoreAllStubs();
    });
};

exports.plexAPIResponses = function() {
    beforeEach('Set up query, find, and postQuery stubs', function() {
        // TODO remove me and all calls to me
    });
};