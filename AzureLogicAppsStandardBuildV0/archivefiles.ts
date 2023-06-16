export class ArchiveFiles {
    private sourceFolder: string;
    private stagingDir: string;
    private buildId: string;

    constructor (sourceFolder: string, stagingDir: string, buildId: string) {
        this.sourceFolder = sourceFolder;
        this.stagingDir = stagingDir;
        this.buildId = buildId;
    }
}