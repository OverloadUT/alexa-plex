process.env.NODE_ENV = 'test';
//require('dotenv').config({path: './test/.env'});

var chai = require('chai');

var sinonChai = require("sinon-chai");
chai.use(sinonChai);

var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

require('sinon-as-promised');
