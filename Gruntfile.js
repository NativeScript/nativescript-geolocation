module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: {
      dist: ["dist"]
    },
    exec: {
        tsc_package: "node node_modules/typescript/bin/tsc -p ./source/",
        npm_pack: {
        cmd: "npm pack ./package",
        cwd: "dist/"
      }
    },
    copy: {
      package: {
        files: [
          {
              expand: true,
              cwd: 'source',
              src: [
                  '**/*.js',
                  '**/*.d.ts',
                  'package.json',
                  'README.md',
                  'platforms/**'
              ],
              dest: 'dist/package'
          }
        ]
      }
    },
    mkdir: {
      dist: {
        options: {
          create: ["dist/package"]
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mkdir');

  // Default task(s).
  grunt.registerTask('default', [
    'clean:dist',
    'exec:tsc_package',
    'mkdir:dist',
    'copy:package',
    'exec:npm_pack'
  ]);
};
