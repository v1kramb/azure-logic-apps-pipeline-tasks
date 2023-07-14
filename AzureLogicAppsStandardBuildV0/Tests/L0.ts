import * as assert from 'assert';
import * as utils from '../utils.js';
import * as mocktest from 'azure-pipelines-task-lib/mock-test';
import fs = require('fs');
import os = require('os');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');

let expectedArchivePath: undefined | string = undefined;

describe('AzureLogicAppsStandardBuild L0 Suite', function () {
    // Localization
    tl.setResourcePath(path.join( __dirname, '..', 'task.json'));

    // Helper functions
    function deleteFolderRecursive (directoryPath: string) {
        if (fs.existsSync(directoryPath)) {
            fs.readdirSync(directoryPath).forEach((file, index) => {
              const curPath = path.join(directoryPath, file);
              if (fs.lstatSync(curPath).isDirectory()) {
               // recurse
                deleteFolderRecursive(curPath);
              } else {
                // delete file
                fs.unlinkSync(curPath);
              }
            });
            fs.rmdirSync(directoryPath);
          }
        };

    function runValidations(validator: () => void, tr: any, done: any) {
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

    before(() => {
        const testTemp = path.join(__dirname, 'srcDir');
        if (!fs.existsSync(testTemp)) {
            fs.mkdirSync(testTemp);
        }
        const testOutput = path.join(__dirname, '_output');
        if (!fs.existsSync(testOutput)) {
            fs.mkdirSync(testOutput);
        }
    })

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

    const files = (n) => {
        return Array.from(
          {length: n}, (v, k) => String(k)
        )
    };

    let test = this;
    let cases = [10]; // [0, 1, 10, 11, 100];
    
    cases.forEach(function(numberOfFiles) {
        it(`Verify plan output for ${numberOfFiles} files has correct number of lines`, (done: Mocha.Done) => {
            test.timeout(1000);
            let max = 10;
            let plan = utils.reportArchivePlan(files(numberOfFiles), max);
            assert(plan.length == Math.min(numberOfFiles+1, max+2));
    
            done();
        });
    });

    it.only('should succeed with simple inputs', function(done: Mocha.Done) {
        this.timeout(1000);
    
        let tp = path.join(__dirname, 'L0Build.js');
        let tr: mocktest.MockTestRunner = new mocktest.MockTestRunner(tp);
    
        tr.run();
        console.log(tr.succeeded);
        console.log("\nhello\n");
        console.log(tr.stdout);
        done();
    });

    it('copy files from srcdir and archive to zipped/out.zip', (done: Mocha.Done) => {
        this.timeout(15000);

        let testPath = path.join(__dirname, 'L0Build.js');
        expectedArchivePath = path.join(__dirname, 'zipped', 'out.zip');
        process.env['sourceFolder'] = path.join(__dirname, 'srcDir');
        process.env['archiveFile'] = expectedArchivePath;
        process.env['BUILD_BUILDID'] = '100';
        process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = __dirname;
        process.env['BUILD_ARTIFACTSTAGINGDIRECTORY'] = __dirname;
        
        let runner: mocktest.MockTestRunner = new mocktest.MockTestRunner(testPath);
        runner.run();

        assert(
            runner.succeeded,
            'should have succeeded');
        assert(
            runner.stdOutContained(`creating path: ${path.normalize('/_output')}`),
            'should have mkdirP _output');
        assert(
            runner.stdOutContained(`creating path: ${path.normalize('/_output/someOtherDir')}`),
            'should have mkdirP someOtherDir');
        assert(
            runner.stdOutContained(`creating path: ${path.normalize('/_output/someOtherDir2')}`),
            'should have mkdirP someOtherDir2');
        assert(
            !runner.stdOutContained(`creating path: ${path.normalize('/_output/someOtherDir3')}`),
            'should not have mkdirP someOtherDir3');
        assert(
            runner.stdOutContained(`copying ${path.normalize('/srcDir/someOtherDir/file1.file')} to ${path.normalize('/_output/someOtherDir/file1.file')}`),
            'should have copied dir1 file1');
        assert(
            runner.stdOutContained(`copying ${path.normalize('/srcDir/someOtherDir/file2.file')} to ${path.normalize('/_output/someOtherDir/file2.file')}`),
            'should have copied dir1 file2');
        assert(
            runner.stdOutContained(`copying ${path.normalize('/srcDir/someOtherDir2/file1.file')} to ${path.normalize('/_output/someOtherDir2/file1.file')}`),
            'should have copied dir2 file1');
        assert(
            runner.stdOutContained(`copying ${path.normalize('/srcDir/someOtherDir2/file2.file')} to ${path.normalize('/_output/someOtherDir2/file2.file')}`),
            'should have copied dir2 file2');
        assert(
            runner.stdOutContained(`copying ${path.normalize('/srcDir/someOtherDir2/file3.file')} to ${path.normalize('/_output/someOtherDir2/file3.file')}`),
            'should have copied dir2 file3');

        // archiving
        runValidations(() => {
            assert(runner.stdout.indexOf('Creating archive') > -1, 'Should have tried to create archive');
            assert(fs.existsSync(expectedArchivePath), `Should have successfully created the archive at ${expectedArchivePath}, instead directory contents are ${fs.readdirSync(path.dirname(expectedArchivePath))}`);
        }, runner, done);
        
        done();
    });
});