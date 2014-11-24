var gulp = require("gulp");
var gutil = require("gulp-util");
var mocha = require("gulp-mocha");
var connect = require('gulp-connect');

// The development server (the recommended option for development)
gulp.task("default", ["test"]);

// perform macha tests
gulp.task('test', function () {
	return gulp.src('./test/suites/**/*.js', {
			read: false
		})
		.pipe(mocha({
			reporter: 'nyan'
		}));
});

gulp.task('mocha-watch', function () {
	gulp.watch(['./**/*.js','!./testWebPackApp/**/*'], ['test']);
});