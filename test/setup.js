// Setup mocha environment
global.sinon = require('sinon');
var chai = global.chai = require('chai');
chai.use(require('sinon-chai'));
chai.should();
global.nock = require('nock');
global.expect = chai.expect;
global.inspect = require('eyes').inspector();
