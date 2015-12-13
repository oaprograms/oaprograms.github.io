module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        //uglify: {
        //    options: {
        //        banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
        //    },
        //    build: {
        //        src: 'js/*.js',
        //        dest: 'app.min.js'
        //    }
        //},
        less: {
            development: {
                options: {
                    // Specifies directories to scan for @import directives when parsing.
                    // Default value is the directory of the source, which is probably what you want.
                    paths: ["css/"]
                },
                files: {
                    // compilation.css  :  source.less
                    "css/style.css": "css/style.less"
                }
            }
        },
        watch: {
            //scripts: {
            //    files: ['js/*.js'],
            //    tasks: ['uglify']
            //},
            less: {
                files: ['css/*.less'],
                tasks: ['less']
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-less');

    // Default task(s).
    grunt.registerTask('default', ['watch']);

};