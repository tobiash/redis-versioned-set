var SET_OPS = ['sadd', 'scard', 'sdiff', 'sdiffstore', 'sinter',
  'sinterstore', 'sismember', 'smembers', 'smove', 'spop',
  'srandmember', 'srem', 'sunion', 'sunionstore'];

function SetVersion(vset, timestamp) {
  this.vset = vset;
  this.timestamp = timestamp;
}

SET_OPS.forEach(function (op) {
  SetVersion.prototype[op] = function () {
    var args = [].slice.call(arguments),
      vset = this.vset;
    vset.getSetKeyAt(this.timestamp, function (err, key) {
      vset.client[op].apply(vset.client, [key].concat(args));
    });
  };
});

SetVersion.prototype.key = function (cb) {
  this.vset.getSetKeyAt(this.timestamp, cb);
};

module.exports = SetVersion;
