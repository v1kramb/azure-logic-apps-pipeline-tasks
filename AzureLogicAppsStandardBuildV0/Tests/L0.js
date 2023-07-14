"use strict";
exports.__esModule = true;
var assert = require("assert");
var utils = require("../utils.js");
var mocktest = require("azure-pipelines-task-lib/mock-test");
var fs = require("fs");
var path = require("path");
var tl = require("azure-pipelines-task-lib/task");
var expectedArchivePath = undefined;
describe('AzureLogicAppsStandardBuild L0 Suite', function () {
    var _this = this;
    // Localization
    tl.setResourcePath(path.join(__dirname, '..', 'task.json'));
    // Helper functions
    function deleteFolderRecursive(directoryPath) {
        if (fs.existsSync(directoryPath)) {
            fs.readdirSync(directoryPath).forEach(function (file, index) {
                var curPath = path.join(directoryPath, file);
                if (fs.lstatSync(curPath).isDirectory()) {
                    // recurse
                    deleteFolderRecursive(curPath);
                }
                else {
                    // delete file
                    fs.unlinkSync(curPath);
                }
            });
            fs.rmdirSync(directoryPath);
        }
    }
    ;
    function runValidations(validator, tr, done) {
        try {
            validator();
            done();
        }
        catch (error) {
            console.log('STDERR', tr.stderr);
            console.log('STDOUT', tr.stdout);
            done(error);
        }
    }
    before(function () {
        var testTemp = path.join(__dirname, 'srcDir');
        if (!fs.existsSync(testTemp)) {
            fs.mkdirSync(testTemp);
        }
        var testOutput = path.join(__dirname, '_output');
        if (!fs.existsSync(testOutput)) {
            fs.mkdirSync(testOutput);
        }
    });
    // this.afterEach(() => {        
    //     try {
    //         if (expectedArchivePath) fs.unlinkSync(expectedArchivePath);
    //         expectedArchivePath = undefined;
    //     } catch (err) {
    //         console.log('Cannot remove created archive: ' + expectedArchivePath);
    //     }
    // });
    // this.afterAll(() => {
    //     const testTemp = path.join(__dirname, 'srcDir');
    //     if (fs.existsSync(testTemp)) {
    //         deleteFolderRecursive(testTemp);
    //     }
    //     const testOutput = path.join(__dirname, '_output');
    //     if (fs.existsSync(testOutput)) {
    //         deleteFolderRecursive(testTemp);
    //     }
    // })
    var files = function (n) {
        return Array.from({ length: n }, function (v, k) { return String(k); });
    };
    var test = this;
    var cases = [10]; // [0, 1, 10, 11, 100];
    cases.forEach(function (numberOfFiles) {
        it("Verify plan output for ".concat(numberOfFiles, " files has correct number of lines"), function (done) {
            test.timeout(1000);
            var max = 10;
            var plan = utils.reportArchivePlan(files(numberOfFiles), max);
            assert(plan.length == Math.min(numberOfFiles + 1, max + 2));
            done();
        });
    });
    it.only('should succeed with simple inputs', function (done) {
        this.timeout(1000);
        var tp = path.join(__dirname, 'L0Build.js');
        var tr = new mocktest.MockTestRunner(tp);
        tr.run();
        console.log(tr.succeeded);
        console.log("\nhello\n");
        console.log(tr.stdout);
        done();
    });
    it('copy files from srcdir and archive to zipped/out.zip', function (done) {
        _this.timeout(15000);
        var testPath = path.join(__dirname, 'L0Build.js');
        expectedArchivePath = path.join(__dirname, 'zipped', 'out.zip');
        process.env['sourceFolder'] = path.join(__dirname, 'srcDir');
        process.env['archiveFile'] = expectedArchivePath;
        process.env['BUILD_BUILDID'] = '100';
        process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = __dirname;
        process.env['BUILD_ARTIFACTSTAGINGDIRECTORY'] = __dirname;
        var runner = new mocktest.MockTestRunner(testPath);
        runner.run();
        assert(runner.succeeded, 'should have succeeded');
        assert(runner.stdOutContained("creating path: ".concat(path.normalize('/_output'))), 'should have mkdirP _output');
        assert(runner.stdOutContained("creating path: ".concat(path.normalize('/_output/someOtherDir'))), 'should have mkdirP someOtherDir');
        assert(runner.stdOutContained("creating path: ".concat(path.normalize('/_output/someOtherDir2'))), 'should have mkdirP someOtherDir2');
        assert(!runner.stdOutContained("creating path: ".concat(path.normalize('/_output/someOtherDir3'))), 'should not have mkdirP someOtherDir3');
        assert(runner.stdOutContained("copying ".concat(path.normalize('/srcDir/someOtherDir/file1.file'), " to ").concat(path.normalize('/_output/someOtherDir/file1.file'))), 'should have copied dir1 file1');
        assert(runner.stdOutContained("copying ".concat(path.normalize('/srcDir/someOtherDir/file2.file'), " to ").concat(path.normalize('/_output/someOtherDir/file2.file'))), 'should have copied dir1 file2');
        assert(runner.stdOutContained("copying ".concat(path.normalize('/srcDir/someOtherDir2/file1.file'), " to ").concat(path.normalize('/_output/someOtherDir2/file1.file'))), 'should have copied dir2 file1');
        assert(runner.stdOutContained("copying ".concat(path.normalize('/srcDir/someOtherDir2/file2.file'), " to ").concat(path.normalize('/_output/someOtherDir2/file2.file'))), 'should have copied dir2 file2');
        assert(runner.stdOutContained("copying ".concat(path.normalize('/srcDir/someOtherDir2/file3.file'), " to ").concat(path.normalize('/_output/someOtherDir2/file3.file'))), 'should have copied dir2 file3');
        // archiving
        runValidations(function () {
            assert(runner.stdout.indexOf('Creating archive') > -1, 'Should have tried to create archive');
            assert(fs.existsSync(expectedArchivePath), "Should have successfully created the archive at ".concat(expectedArchivePath, ", instead directory contents are ").concat(fs.readdirSync(path.dirname(expectedArchivePath))));
        }, runner, done);
        done();
    });
});