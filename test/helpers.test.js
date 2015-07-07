var expect = require('chai').expect;
//var sinon = require('sinon');

describe('getClientIP', function() {
    require('./plex-api-stubs.helper.js').plexAPIStubs();

    it('should return the IP from cache without an API call', function () {
        process.env.PLEXPLAYER_IP = "MOCHATEST_CACHED_PLAYER_IP";

        var self = this;
        return expect(this.lambda._private.getClientIP('clientname'))
            .to.eventually.equal('MOCHATEST_CACHED_PLAYER_IP')
            .then(function(){
                expect(self.plexAPIStubs.find).to.not.have.been.called;
            });
    });

    it('should call the API to get an IP if not cached', function () {
        delete process.env.PLEXPLAYER_IP;

        this.plexAPIStubs.find.withArgs('/clients')
            .resolves(require('./samples/clients.json'));

        var self = this;
        return expect(this.lambda._private.getClientIP('clientname'))
            .to.eventually.equal('STUBBED_CLIENT_ADDRESS_FROM_API_CALL')
            .then(function(){
                expect(self.plexAPIStubs.find).to.have.been.calledOnce;
            });
    });

    it('should reject the promise on a failed API call', function () {
        delete process.env.PMS_IDENTIFIER;

        this.plexAPIStubs.find.withArgs('/clients')
            .rejects(new Error("Stub error from Plex API"));

        return expect(this.lambda._private.getClientIP('clientname'))
            .to.be.rejected;
    });
});

describe('getMachineIdentifier', function() {
    require('./plex-api-stubs.helper.js').plexAPIStubs();

    it('should return the identifier from cache without an API call', function () {
        process.env.PMS_IDENTIFIER = "MOCHATEST_CACHED_MACHINE_ID";

        var self = this;
        return expect(this.lambda._private.getMachineIdentifier())
            .to.eventually.equal('MOCHATEST_CACHED_MACHINE_ID')
            .then(function(){
                expect(self.plexAPIStubs.query).to.not.have.been.called;
            });
    });

    it('should call the API to get the identifier if not cached', function () {
        delete process.env.PMS_IDENTIFIER;

        this.plexAPIStubs.query.withArgs('/')
            .resolves(require('./samples/root.json'));

        var self = this;
        return expect(this.lambda._private.getMachineIdentifier())
            .to.eventually.equal('STUBBED_SERVER_MACHINE_IDENTIFIER_FROM_API_CALL')
            .then(function(){
                expect(self.plexAPIStubs.query).to.have.been.calledOnce;
            });
    });

    it('should reject the promise on a failed API call', function () {
        delete process.env.PMS_IDENTIFIER;

        this.plexAPIStubs.query.withArgs('/')
            .rejects(new Error("Stub error from Plex API"));

        return expect(this.lambda._private.getMachineIdentifier())
            .to.be.rejected;
    });
});