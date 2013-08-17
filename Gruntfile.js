var path = require('path');

module.exports = function (grunt) {

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({

  });

  grunt.registerTask('doc', 'Generate Documentation', function () {
    var done = this.async();
    grunt.log.writeln('Generate Documentation...');
    require('child_process')
      .spawn('./node_modules/.bin/groc', ['lib/*.js', 'README.md'])
      .on('exit', function () {
        grunt.log.writeln('...done!');
        done();
      });
  });

};
