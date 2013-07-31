
/**
 * @description Watch, concat and minify for dist.
 */

module.exports = function(grunt) {

  grunt.initConfig({
    jshint: {
      options: {
        browser: true,
        globals: {
          jQuery: true
        }
      },
      files: {
        src: [
          'Gruntfile.js',
          'js/src/**/*.js'
        ]
      }
    },
    watch: {
      scripts: {
        files: [
          'Gruntfile.js',
          'js/src/**/*.js'
        ],
        tasks: ['jshint']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.registerTask('default', ['jshint','watch']);

};

/* EOF */