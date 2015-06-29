/* jshint node: true */
process.env.NODE_ENV = 'test';
var sinon = require('sinon');
var chai = require('chai');
var sinonChai = require("sinon-chai");
chai.use(sinonChai);
var expect = require('chai').expect;
//require('dotenv').config({path: './test/.env'});

describe('Main handler basic functionality', function () {
    var lambda = require('../index.js');

    beforeEach(function(){
    });

    afterEach(function(){
    });

    //it('should reject invalid AppID', function () {
    //    var request = require('./LaunchRequestInvalidApp.json');
    //    // TODO reject invalid AppID
    //});

    it('should handle LaunchRequest', function (done) {
        var request = require('./LaunchRequest.json');

        lambda.handler(request, {
            succeed: function(res) {
                console.log(res);
                expect(res.response.shouldEndSession).to.be.true;
                expect(res.response.card).to.not.exist;
                expect(res.response.outputSpeech.text).to.contain('Plex is ready');
                done();
            }, fail: function(res) {
                expect.fail();
                done();
            }
        });
    });
});