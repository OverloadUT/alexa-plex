var proxyquire = require('proxyquire');
var sinon = require('sinon');

exports.plexAPIStubs = function() {
    beforeEach('set up main module with stubs for all plex-api methods', function () {
        // TODO this is all a huge mess after it was changed to account for the new way PlexAPI is instantiated.
        // Can probably be made much simpler and easier to understand

        var self = this;
        this.plexAPIStubs = {
            query: function () {},
            postQuery: function () {},
            perform: function () {},
            find: function () {}
        };

        sinon.stub(self.plexAPIStubs, 'query').rejects(new Error('Unhandled URI in query stub'));
        sinon.stub(self.plexAPIStubs, 'postQuery').rejects(new Error('Unhandled URI in postQuery stub'));
        sinon.stub(self.plexAPIStubs, 'perform').rejects(new Error('Unhandled URI in perform stub'));
        sinon.stub(self.plexAPIStubs, 'find').rejects(new Error('Unhandled URI in find stub'));

        this.plexAPIUtils = {
            stubAll      : function () {
            }, restoreAll: function () {
                self.plexAPIStubs.query.restore();
                self.plexAPIStubs.postQuery.restore();
                self.plexAPIStubs.perform.restore();
                self.plexAPIStubs.find.restore();
            }, construct : function (opts) {
                this.query = self.plexAPIStubs.query;
                this.postQuery = self.plexAPIStubs.postQuery;
                this.perform = self.plexAPIStubs.perform;
                this.find = self.plexAPIStubs.find;
                this.getIdentifier = sinon.stub().returns('STUBBED-IDENTIFIER');

                self.plexAPIUtils.stubAll();
            }
        };

        if(process.env.NODE_ENV === 'test') {
            this.lambda = proxyquire('../index.js', {
                'plex-api': this.plexAPIUtils.construct
            });
        } else if (process.env.NODE_ENV === 'test-live'){
            this.lambda = require('../index.js');
            this.plexAPIUtils.construct();
        }
    });

    beforeEach('Reset all plex-api stubs', function() {
        //this.plexAPIUtils.stubAll();
    });

    afterEach('Restore all plex-api stubs to blank methods', function() {
        //this.plexAPIUtils.restoreAll();
    });
};

exports.plexAPIResponses = function() {
    beforeEach('Set up query, find, and postQuery stubs', function() {
        this.plexAPIStubs.query.withArgs('/').resolves(require('./samples/root.json'));
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
};