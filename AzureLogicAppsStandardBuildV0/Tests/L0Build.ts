// Taken from: https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/CopyFilesV2/Tests/L0copyAllFiles.ts

import fs = require('fs');
import mockanswer = require('azure-pipelines-task-lib/mock-answer');
import mockrun = require('azure-pipelines-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'azurelogicappsstandardbuild.js');
let runner: mockrun.TaskMockRunner = new mockrun.TaskMockRunner(taskPath);
// process.env['AGENT_TEMPDIRECTORY'] = path.join(__dirname, 'test_temp');
process.env['BUILD_BUILDID'] = '100';
process.env['SYSTEM_DEFAULTWORKINGDIRECTORY'] = __dirname;
process.env['BUILD_ARTIFACTSTAGINGDIRECTORY'] = __dirname;
runner.setInput('sourceFolder', path.normalize(path.join(__dirname, 'srcDir')));
runner.setInput('archiveFile', path.normalize(path.join(__dirname, 'zipped', 'out.zip')));

let answers = <mockanswer.TaskLibAnswers> {
    checkPath: { },
    find: { },
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

const fsClone = Object.assign({}, fs);
Object.assign(fsClone, {
    existsSync(itemPath: string): boolean {
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
    statSync(itemPath: string): fs.Stats {
        const itemStats: fs.Stats = new fs.Stats();
        switch (itemPath) {
            case path.normalize('/srcDir/someOtherDir'):
            case path.normalize('/srcDir/someOtherDir2'):
            case path.normalize('/srcDir/someOtherDir3'):
                itemStats.isDirectory = () => true;
                break;
            case path.normalize('/srcDir/someOtherDir/file1.file'):
            case path.normalize('/srcDir/someOtherDir/file2.file'):
            case path.normalize('/srcDir/someOtherDir2/file1.file'):
            case path.normalize('/srcDir/someOtherDir2/file2.file'):
            case path.normalize('/srcDir/someOtherDir2/file3.file'):
                itemStats.isDirectory = () => false;
                break;
            default:
                throw { code: 'ENOENT' };
        }
        return itemStats;
    },
    // as a precaution, disable fs.chmodSync. it should not be called during this scenario.
    chmodSync(p: fs.PathLike, mode: fs.Mode): void {}
});

runner.registerMock('fs', fsClone);

runner.run();