var _ = require('lodash'),
  slice = [].slice,
  SetVersion = require('./set_version');

function prefixFn(prefix) {
  return function (str) {
    return [prefix, str].join(':');
  };
}

function VersionedSet(prefixStr, client, opts) {
  this.prefix = prefixFn(prefixStr);
  this.setIds = this.prefix('setIds');
  this.sorted = this.prefix('history');

  this.client = client;
  this.opts = opts;
}

// Get the key of the current set
VersionedSet.prototype.getSetKey = function (id) {
  return this.prefix('sets:' + id);
};

// Perform a versioned operation. 
//
// 
//
VersionedSet.prototype.versionedOperation = function (fn, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts;
    opts = {};
  }
  opts = _.merge(opts, {
    date: Date.now()
  });

  var vset = this,
    id = 0,
    currentId = 0,
    c = this.client;
  c.incr(this.setIds, function (err, id) {
    currentId = id - 1;
    var m = c.multi();
    if (id > 1) {
      m.sunionstore(vset.getSetKey(id), vset.getSetKey(currentId));
    }
    fn(m, vset.getSetKey(id));
    m.zadd(vset.sorted, opts.date, id);
    m.exec(cb);
  });
};

VersionedSet.prototype.add = function () {
  var entries = slice.call(arguments),
    cb = entries.pop();
  this.versionedOperation(function (m, key) {
    m.sadd.apply(m, [key].concat(entries));
  }, cb);
};

VersionedSet.prototype.remove = function () {
  var entries = slice.call(arguments),
    cb = entries.pop();
  this.versionedOperation(function (m, key) {
    m.srem.apply(m, [key].concat(entries));
  }, cb);
};

VersionedSet.prototype.replace = function (oldEntry, newEntry, cb) {
  this.versionedOperation(function (m, key) {
    m.srem(key, oldEntry);
    m.sadd(key, newEntry);
  }, cb);
};

VersionedSet.prototype.at = function (timestamp) {
  return new SetVersion(this, timestamp);
};

VersionedSet.prototype.now = function () {
  return this.at();
};

VersionedSet.prototype.currentSetKey = function (cb) {
  var vset = this;
  this.client.get(this.prefix('setIds'), function (err, id) {
    cb(err, vset.getSetKey(id));    
  });
};

VersionedSet.prototype.getSetKeyAt = function (timestamp, cb) {
  var vset = this;
  if (arguments.length == 1 && typeof timestamp === 'function') {
    cb = timestamp; timestamp = null;
  }
  if (typeof timestamp === 'number') {
    this.client.zrevrangebyscore(this.sorted, timestamp, '-inf', 'limit', 0, 1, function (err, id) {
      cb(err, vset.getSetKey(id));
    });
  } else {
    this.currentSetKey(cb);
  }
};

VersionedSet.prototype.union = function (from, to, cb) {
  var c = this.client, vset = this;
  c.zrangebyscore(this.sorted, from, to, function (err, ids) {
    if (ids.length === 0) {
      return [];
    }
    c.sunion.apply(c, ids.map(function (id) { 
      return vset.getSetKey(id); 
    }).concat(cb));
  });
};

module.exports = VersionedSet;
