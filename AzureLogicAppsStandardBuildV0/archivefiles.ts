// Adapted from: https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/ArchiveFilesV2/archivefiles.ts

import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import tr = require('azure-pipelines-task-lib/toolrunner');
import fs = require('fs');
import stream = require("stream");
import utils = require('./utils.js');

/*
rootFolderOrFile: '$(System.DefaultWorkingDirectory)/project_output'
includeRootFolder: false
archiveType: 'zip'
archiveFile: '$(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip'
replaceExistingArchive: true
*/

export class ArchiveFiles {
    private defaultWorkingDir: string;
    private stagingDir: string;
    private buildId: string;

    constructor(defaultWorkingDir: string, stagingDir: string, buildId: string) {
        this.defaultWorkingDir = defaultWorkingDir;
        this.stagingDir = stagingDir;
        this.buildId = buildId;
    }

    public async main() {
        
    }
}