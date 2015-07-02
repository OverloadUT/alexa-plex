/* jshint node: true */
process.env.NODE_ENV = 'test';
//require('dotenv').config({path: './test/.env'});

var sinon = require('sinon');
var chai = require('chai');
var expect = require('chai').expect;
var sinonChai = require("sinon-chai");
chai.use(sinonChai);
require('sinon-as-promised')

var plexAPI = require('plex-api');

var requestTemplate = require('./RequestTemplate.json');

describe('Main handler basic functionality', function () {
    var lambda = require('../index.js');

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
    var lambda = require('../index.js');
    var plexQuerySpy;
    var plexPostQuerySpy;
    var plexPerformSpy;

    beforeEach(function() {
        //plex = new plexAPI('localhost');
        //plexQueryStub = sinon.stub(plex, 'query')
        //    .resolves('a');
        plexQuerySpy = sinon.spy(lambda.plex, 'query');
        plexPostQuerySpy = sinon.spy(lambda.plex, 'postQuery');
        plexPerformSpy = sinon.spy(lambda.plex, 'perform');
    });

    afterEach(function() {
        plexQuerySpy.restore();
        plexPostQuerySpy.restore();
        plexPerformSpy.restore();
    });

    describe('OnDeckIntent', function() {
        it('should handle OnDeck Intent', function (done) {
            var request = JSON.parse(JSON.stringify(requestTemplate)); // Yes this is slow but hey it's just tests?
            request.request.type = 'IntentRequest';
            request.request.intent.name = 'OnDeckIntent';

            lambda.handler(request, {
                succeed: function(res) {
                    //console.log(res);
                    expect(res.response.shouldEndSession).to.be.true;
                    expect(res).to.have.deep.property('response.card.subtitle')
                        .that.matches(/on deck/i);
                    expect(res).to.have.deep.property('response.outputSpeech.text')
                        .that.matches(/on deck/i);
                    expect(plexQuerySpy).to.have.been.calledOnce;
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
                    //console.log(res);
                    expect(res.response.shouldEndSession).to.be.true;
                    expect(res).to.have.deep.property('response.card.subtitle')
                        .that.matches(/ShowInfoIntent/i);
                    expect(res).to.have.deep.property('response.outputSpeech.text');
                    expect(plexQuerySpy).to.have.been.calledOnce;
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
            request.request.intent.slots.showName = {name: 'showName', value: 'dreadful'};

            lambda.handler(request, {
                succeed: function(res) {
                    console.log(res);
                    expect(res.response.shouldEndSession).to.be.true;
                    expect(res).to.have.deep.property('response.card.subtitle')
                        .that.matches(/StartShowIntent/i);
                    expect(res).to.have.deep.property('response.outputSpeech.text');
                    expect(plexPerformSpy).to.have.been.calledWithMatch(/playMedia/i);
                    expect(plexPostQuerySpy).to.have.been.calledWithMatch(/playQueues/i);
                    done();
                }, fail: function(res) {
                    console.log(res);
                    done(Error('Lambda returned fail()'));
                }
            });
        });
    });

    //it('should handle OnDeck Intent', function (done) {
    //    var request = JSON.parse(JSON.stringify(requestTemplate)); // Yes this is slow but hey it's just tests?
    //    request.request.type = 'IntentRequest';
    //    request.request.intent.name = 'StartShowIntent';
    //
    //    lambda.handler(request, {
    //        succeed: function(res) {
    //            console.log(res);
    //            expect(res.response.shouldEndSession).to.be.true;
    //            expect(res).to.have.deep.property('response.card.subtitle')
    //                .that.matches(/on deck/i);
    //            expect(res).to.have.deep.property('response.outputSpeech.text')
    //                .that.matches(/on deck/i);
    //            expect(plexQuerySpy).to.have.been.calledOnce;
    //            done();
    //        }, fail: function(res) {
    //            console.log(res);
    //            done(Error('Lambda returned fail()'));
    //        }
    //    });
    //});
});


