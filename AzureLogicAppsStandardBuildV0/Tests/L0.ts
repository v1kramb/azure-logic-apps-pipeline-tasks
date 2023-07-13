import * as assert from 'assert';
import * as utils from '../utils.js';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import fs = require('fs');
import os = require('os');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import { IExecSyncResult } from 'azure-pipelines-task-lib/toolrunner.js';

let expectedArchivePath: undefined | string = '/zipped';

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

    function runValidations(validator: () => void, tr: IExecSyncResult, done: any) {
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

    this.afterEach(() => {        
        try {
            if (expectedArchivePath) fs.unlinkSync(expectedArchivePath);
            expectedArchivePath = undefined;
        } catch (err) {
            console.log('Cannot remove created archive: ' + expectedArchivePath);
        }
    });

    this.afterAll(() => {
        const testTemp = path.join(__dirname, 'srcDir');
        if (fs.existsSync(testTemp)) {
            deleteFolderRecursive(testTemp);
        }
        const testOutput = path.join(__dirname, '_output');
        if (fs.existsSync(testOutput)) {
            deleteFolderRecursive(testTemp);
        }
    })

    const files = (n) => {
        return Array.from(
          {length: n}, (v, k) => String(k)
        )
    };

    let test = this;
    let cases = [0, 1, 10, 11, 100];
    
    cases.forEach(function(numberOfFiles) {
        it(`Verify plan output for ${numberOfFiles} files has correct number of lines`, (done: Mocha.Done) => {
            test.timeout(1000);
            let max = 10;
            let plan = utils.reportArchivePlan(files(numberOfFiles), max);
            assert(plan.length == Math.min(numberOfFiles+1, max+2));
    
            done();
        });
    });

    it('copy files from srcdir and archive to zipped/out.zip', (done: Mocha.Done) => {
        this.timeout(15000);

        let testPath = path.join(__dirname, 'L0copyAndZip.js');
        expectedArchivePath = path.join(__dirname, 'zipped', 'out.zip');
        process.env['archiveFile'] = expectedArchivePath;
        
        let runner: mocktest.MockTestRunner = new mocktest.MockTestRunner(testPath);
        runner.run();

        // copying
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
            if (process.platform.indexOf('win32') >= 0) {
                assert(runner.stdout.indexOf('Add new data to archive: 3 folders, 3 files') > -1, 'Should have found 6 items to compress');
            } else {
                assert(runner.stdout.indexOf('adding: test_folder/ (') > -1, 'Should have found 6 items to compress');
                assert(runner.stdout.indexOf('adding: test_folder/a/ (') > -1, 'Should have found 6 items to compress');
                assert(runner.stdout.indexOf('adding: test_folder/a/abc.txt (') > -1, 'Should have found 6 items to compress');
                assert(runner.stdout.indexOf('adding: test_folder/a/def.txt (') > -1, 'Should have found 6 items to compress');
                assert(runner.stdout.indexOf('adding: test_folder/b/ (') > -1, 'Should have found 6 items to compress');
                assert(runner.stdout.indexOf('adding: test_folder/b/abc.txt (') > -1, 'Should have found 6 items to compress');
            }
            assert(fs.existsSync(expectedArchivePath), `Should have successfully created the archive at ${expectedArchivePath}, instead directory contents are ${fs.readdirSync(path.dirname(expectedArchivePath))}`);
        }, tr, done);
        
        done();
    });

    it('Successfully creates a zip', function(done: Mocha.Done) {
        this.timeout(10000);
        process.env['archiveType'] = 'zip';
        
        process.env['includeRootFolder'] = 'true';
        expectedArchivePath = path.join(__dirname, 'test_output', 'myZip.zip');

        let tp: string = path.join(__dirname, 'L0CreateArchive.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        runner.run();
        
    });
});