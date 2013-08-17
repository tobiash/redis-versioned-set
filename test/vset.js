/* jshint esnext: true */
var genny = require('genny'),
  VersionedSet = require('../lib/versioned_set'),
  rsm = require('redis-server-manager');


function its(name, gen) {
  it(name, function (done) {
    genny.run(gen, done);
  });
}

/**
 * Tests
 * =====
 *
 * Note that the tests (not the actual module are written using ES6 generators).
 * Invoke `mocha --harmony-generators` or `npm test`
 */

describe('Versioned Set', function () {

  var set, c;

  beforeEach(function (done) {
    genny.run(function* (resume) {
      var server = yield rsm.createTestServer(resume());
      c = server.createClient();
      set = new VersionedSet('testSet', c);
    }, done);
  });

  its('should add elements', function* (resume) {
    yield set.add('a', resume());
  });

  its('added elements should be there', function* (resume) {
    yield set.add('a', resume());
    var key = yield set.currentSetKey(resume());
    var ismember = yield c.sismember(key, 'a', resume());
    ismember.should.eql(1);
  });

  describe('when adding elements at different times', function () {

    var atime, btime, clock;

    beforeEach(function (done) {
      genny.run(function* (resume) {
        clock = sinon.useFakeTimers();
        yield set.add('a', resume());
        atime = Date.now();
        clock.tick(30);
        yield set.add('b', resume());
        btime = Date.now();
      }, done);
    });

    afterEach(function () {
      clock.restore();
    });


    its('should contain both elements in the current set', function* (resume) {
      set.now().sismember('a', resume());
      set.now().sismember('b', resume());
      var a = yield resume, b = yield resume;
      a.should.equal(1);
      b.should.equal(1);
    });

    its('should contain only one at atime', function* (resume) {
      var containsA = yield set.at(atime).sismember('a', resume()),
        containsB = yield set.at(atime).sismember('b', resume());
      containsA.should.eql(1);
      containsB.should.eql(0);
    });
    its('set key should be different', function* (resume) {
      var keyA = yield set.getSetKeyAt(atime, resume());
      var keyB = yield set.getSetKeyAt(btime, resume());
      keyA.should.not.eql(keyB);
    });
  });

  describe('adding & removing', function () {
    var times = [], clock;
    beforeEach(function (done) {
      genny.run(function* (resume) {
        clock = sinon.useFakeTimers();
        yield set.add('a', resume());
        times.push(Date.now());
        clock.tick(10);

        yield set.add('b', resume());
        times.push(Date.now());
        clock.tick(10);

        yield set.add('c', resume());
        times.push(Date.now());
        clock.tick(10);

        yield set.remove('c', resume());
        times.push(Date.now());
        
      }, done);
    });

    afterEach(function () {
      clock.restore();
    });

    its('should contain a and b in the end', function* (resume) {
      (yield set.now().sismember('a', resume())).should.equal(1);
      (yield set.now().sismember('b', resume())).should.equal(1);
      (yield set.now().sismember('c', resume())).should.equal(0);
    });

    its('should contain c in between', function* (resume) {
      (yield set.at(times[2]).sismember('c', resume())).should.equal(1);
    });

    its('union should contain all', function* (resume) {
      (yield set.union(times[0], Date.now(), resume())).should.include.members(['a','b','c']).and.have.lengthOf(3);
    });

  });

});
