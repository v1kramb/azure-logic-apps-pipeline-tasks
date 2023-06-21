// Adapted from: https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/ArchiveFilesV2/archivefiles.ts

import path = require('path');

export class ArchiveFiles {
    private sourceFolder: string;
    private stagingDir: string;
    private buildId: string;

    constructor(sourceFolder: string, stagingDir: string, buildId: string) {
        this.sourceFolder = sourceFolder;
        this.stagingDir = stagingDir;
        this.buildId = buildId;
    }
}