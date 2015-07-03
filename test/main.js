/* jshint node: true */
process.env.NODE_ENV = 'test';
//require('dotenv').config({path: './test/.env'});
var proxyquire = require('proxyquire');
var Q = require('q');
var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;
var sinonChai = require("sinon-chai");
chai.use(sinonChai);
require('sinon-as-promised');

var requestTemplate = require('./RequestTemplate.json');

var plexAPIStubs = {
    query: sinon.stub(),
    postQuery: sinon.stub(),
    perform: sinon.stub(),
    find: sinon.stub(),
    getIdentifier: sinon.stub().returns('MOCHATESTS'),
    resetAll: function() {
        plexAPIStubs.query.reset();
        plexAPIStubs.postQuery.reset();
        plexAPIStubs.perform.reset();
        plexAPIStubs.find.reset();
    }
};

plexAPIStubs.query.rejects(new Error('Unhandled URI in query stub'));
plexAPIStubs.query.withArgs('/library/onDeck').resolves(require('./samples/library_onDeck.json'));
plexAPIStubs.query.withArgs('/').resolves(require('./samples/root.json'));
plexAPIStubs.query.withArgs(sinon.match(/\/library\/metadata\/[0-9]+/)).resolves(require('./samples/library_metadata_item.json'));
plexAPIStubs.query.withArgs(sinon.match(/\/library\/sections\/[0-9]+\/all/)).resolves(require('./samples/library_section_allshows.json'));
plexAPIStubs.query.withArgs(sinon.match(/\/library\/metadata\/[0-9]+\/allLeaves/)).resolves(require('./samples/library_metadata_showepisodes.json'));

plexAPIStubs.postQuery.rejects(new Error('Unhandled URI in postQuery stub'));
plexAPIStubs.postQuery.withArgs(sinon.match(/\/playQueues/)).resolves(require('./samples/playqueues.json'));

plexAPIStubs.perform.rejects(new Error('Unhandled URI in perform stub'));
plexAPIStubs.perform.withArgs(sinon.match(/\/playMedia/)).resolves(null, true);

plexAPIStubs.find.rejects(new Error('Unhandled URI in find stub'));
plexAPIStubs.find.withArgs('/clients').resolves(require('./samples/clients.json'));


var plexAPIStubConstructor = function(opts) {
    this.query = plexAPIStubs.query;
    this.postQuery = plexAPIStubs.postQuery;
    this.perform = plexAPIStubs.perform;
    this.find = plexAPIStubs.find;
    this.getIdentifier = plexAPIStubs.getIdentifier;
};

var lambda = proxyquire('../index.js', {
    'plex-api': plexAPIStubConstructor
});
//var lambda = require('../index.js');

afterEach(function() {
    plexAPIStubs.resetAll();
});

describe('Main handler basic functionality', function () {
    //it('should reject invalid AppID', function () {
    //    var request = require('./LaunchRequestInvalidApp.json');
    //    // TODO reject invalid AppID
    //});

    it('should handle LaunchRequest', function (done) {
        var request = JSON.parse(JSON.stringify(requestTemplate)); // Yes this is slow but hey it's just tests?
        request.request.type = 'LaunchRequest';

        lambda.handler(request, {
            succeed: function(res) {
                //console.log(res);
                expect(res.response.shouldEndSession).to.be.true;
                expect(res).to.not.have.deep.property('response.card');
                expect(res).to.have.deep.property('response.outputSpeech.text')
                    .that.matches(/plex is ready/i);

                done();
            }, fail: function(res) {
                console.log(res);
                expect.fail();
                done();
            }
        });
    });
});

describe('Intents', function () {

    describe('OnDeckIntent', function() {
        it('should handle OnDeck Intent', function (done) {
            var request = JSON.parse(JSON.stringify(requestTemplate)); // Yes this is slow but hey it's just tests?
            request.request.type = 'IntentRequest';
            request.request.intent.name = 'OnDeckIntent';

            lambda.handler(request, {
                succeed: function(res) {
                    expect(res.response.shouldEndSession).to.be.true;
                    expect(res).to.have.deep.property('response.card.subtitle')
                        .that.matches(/on deck/i);
                    expect(res).to.have.deep.property('response.outputSpeech.text')
                        .that.matches(/on deck/i);
                    expect(plexAPIStubs.query).to.have.been.calledOnce;
                    done();
                }, fail: function(res) {
                    console.log(res);
                    done(Error('Lambda returned fail()'));
                }
            });
        });
    });

    describe('ShowInfoIntent', function() {
        it('should handle ShowInfo Intent', function (done) {
            var request = JSON.parse(JSON.stringify(requestTemplate)); // Yes this is slow but hey it's just tests?
            request.request.type = 'IntentRequest';
            request.request.intent.name = 'ShowInfoIntent';

            lambda.handler(request, {
                succeed: function(res) {
                    expect(res.response.shouldEndSession).to.be.true;
                    expect(res).to.have.deep.property('response.card.subtitle')
                        .that.matches(/ShowInfoIntent/i);
                    expect(res).to.have.deep.property('response.outputSpeech.text');
                    expect(plexAPIStubs.query).to.have.been.calledOnce;
                    done();
                }, fail: function(res) {
                    console.log(res);
                    done(Error('Lambda returned fail()'));
                }
            });
        });
    });

    describe('StartShowIntent', function() {
        it('should handle StartShow Intent', function (done) {
            var request = JSON.parse(JSON.stringify(requestTemplate)); // Yes this is slow but hey it's just tests?
            request.request.type = 'IntentRequest';
            request.request.intent.name = 'StartShowIntent';
            request.request.intent.slots.showName = {name: 'showName', value: 'adventure time'};

            lambda.handler(request, {
                succeed: function(res) {
                    //console.log(res);
                    expect(res.response.shouldEndSession).to.be.true;
                    expect(res).to.have.deep.property('response.card.subtitle')
                        .that.matches(/StartShowIntent/i);
                    expect(res).to.have.deep.property('response.outputSpeech.text');
                    expect(plexAPIStubs.perform).to.have.been.calledWithMatch(/playMedia/i);
                    expect(plexAPIStubs.postQuery).to.have.been.calledWithMatch(/playQueues/i);
                    done();
                }, fail: function(res) {
                    console.log(res);
                    done(Error('Lambda returned fail()'));
                }
            });
        });
    });
});


