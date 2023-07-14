"use strict";
// Taken from: https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/CopyFilesV2/Tests/L0copyAllFiles.ts
exports.__esModule = true;
var fs = require("fs");
var mockrun = require("azure-pipelines-task-lib/mock-run");
var path = require("path");
var taskPath = path.join(__dirname, '..', 'azurelogicappsstandardbuild.js');
var runner = new mockrun.TaskMockRunner(taskPath);
// process.env['AGENT_TEMPDIRECTORY'] = path.join(__dirname, 'test_temp');
process.env['BUILD_BUILDID'] = '100';
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = __dirname;
process.env['BUILD_ARTIFACTSTAGINGDIRECTORY'] = __dirname;
runner.setInput('sourceFolder', path.normalize(path.join(__dirname, 'srcDir')));
runner.setInput('archiveFile', path.normalize(path.join(__dirname, 'zipped', 'out.zip')));
var answers = {
    checkPath: {},
    find: {}
};
answers.checkPath[path.normalize('/srcDir')] = true;
answers.find[path.normalize('/srcDir')] = [
    path.normalize('/srcDir'),
    path.normalize('/srcDir/someOtherDir'),
    path.normalize('/srcDir/someOtherDir/file1.file'),
    path.normalize('/srcDir/someOtherDir/file2.file'),
    path.normalize('/srcDir/someOtherDir2'),
    path.normalize('/srcDir/someOtherDir2/file1.file'),
    path.normalize('/srcDir/someOtherDir2/file2.file'),
    path.normalize('/srcDir/someOtherDir2/file3.file'),
    path.normalize('/srcDir/someOtherDir3'),
];
runner.setAnswers(answers);
var fsClone = Object.assign({}, fs);
Object.assign(fsClone, {
    existsSync: function (itemPath) {
        switch (itemPath) {
            case path.normalize('/srcDir'):
            case path.normalize('/srcDir/someOtherDir'):
            case path.normalize('/srcDir/someOtherDir/file1.file'):
            case path.normalize('/srcDir/someOtherDir/file2.file'):
            case path.normalize('/srcDir/someOtherDir2'):
            case path.normalize('/srcDir/someOtherDir2/file1.file'):
            case path.normalize('/srcDir/someOtherDir2/file2.file'):
            case path.normalize('/srcDir/someOtherDir2/file3.file'):
            case path.normalize('/srcDir/someOtherDir3'):
                return true;
            default:
                return false;
        }
    },
    statSync: function (itemPath) {
        var itemStats = new fs.Stats();
        switch (itemPath) {
            case path.normalize('/srcDir/someOtherDir'):
            case path.normalize('/srcDir/someOtherDir2'):
            case path.normalize('/srcDir/someOtherDir3'):
                itemStats.isDirectory = function () { return true; };
                break;
            case path.normalize('/srcDir/someOtherDir/file1.file'):
            case path.normalize('/srcDir/someOtherDir/file2.file'):
            case path.normalize('/srcDir/someOtherDir2/file1.file'):
            case path.normalize('/srcDir/someOtherDir2/file2.file'):
            case path.normalize('/srcDir/someOtherDir2/file3.file'):
                itemStats.isDirectory = function () { return false; };
                break;
            default:
                throw { code: 'ENOENT' };
        }
        return itemStats;
    },
    // as a precaution, disable fs.chmodSync. it should not be called during this scenario.
    chmodSync: function (p, mode) { }
});
runner.registerMock('fs', fsClone);
runner.run();
