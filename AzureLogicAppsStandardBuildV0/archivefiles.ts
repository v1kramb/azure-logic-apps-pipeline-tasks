// Adapted from: https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/ArchiveFilesV2/archivefiles.ts
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');
import tr = require('azure-pipelines-task-lib/toolrunner');
import fs = require('fs');
import stream = require("stream");
import utils = require('./utils.js');

export class ArchiveFiles {
    private defaultWorkingDir: string;
    private stagingDir: string;
    private buildId: string;

    private rootFolderOrFile: string;
    private archiveFile: string;

    constructor(defaultWorkingDir: string, stagingDir: string, buildId: string) {
        this.defaultWorkingDir = defaultWorkingDir;
        this.stagingDir = stagingDir;
        this.buildId = buildId;

        this.rootFolderOrFile = this.makeAbsolute(path.normalize(path.join(
            this.defaultWorkingDir, 'project_output'
        ).trim())); // $(System.DefaultWorkingDirectory)/project_output

        this.archiveFile = path.normalize(path.join(this.stagingDir, this.buildId + '.zip').trim()); // $(Build.ArtifactStagingDirectory)/$(Build.BuildId).zip
    }

    private getSevenZipLocation(): string {
        if (process.platform == 'win32') {
            return path.join(__dirname, '7zip/7z.exe');
        } 
        else {
            return tl.which('7z', true);
        }
    }

    /**
     * Finds files in root folder. Excludes root folder itself.
     * @returns string array of files
     */
    private findFiles(): string[] {
        var fullPaths: string[] = tl.ls('-A', [this.rootFolderOrFile]);
        var baseNames: string[] = [];
        for (var i = 0; i < fullPaths.length; i++) {
            baseNames[i] = path.basename(fullPaths[i]);
        }
        return baseNames;
    }

    /**
     * Converts normalized path to absolute path
     * @returns absolute path
     */
    private makeAbsolute(normalizedPath: string): string {
        tl.debug('makeAbsolute:' + normalizedPath);
    
        var result = normalizedPath;
        if (!path.isAbsolute(normalizedPath)) {
            result = path.join(this.defaultWorkingDir, normalizedPath);
            tl.debug('Relative file path: ' + normalizedPath + ' resolving to: ' + result);
        }
        return result;
    }

    /**
     * Creates file list which is called in sevenZipArchive()
     * @returns string array of files
     */
    private createFileList(files: string[]): string {
        const tempDirectory: string = tl.getVariable('Agent.TempDirectory')!;
        const fileName: string = Math.random().toString(36).replace('0.', '');
        const file: string = path.resolve(tempDirectory, fileName);
    
        try {
            fs.writeFileSync(
                file,
                files.reduce((prev, cur) => prev + cur + "\n", ""),
                { encoding: "utf8" });
        }
        catch (error) {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
    
            throw error;
        }
    
        return file;
    }
    
    private getOptions(): tr.IExecSyncOptions {
        var dirName: string;
        var stats: tl.FsStats = tl.stats(this.rootFolderOrFile);
        if (stats.isFile()) {
            dirName = path.dirname(this.rootFolderOrFile);
        } else {
            dirName = this.rootFolderOrFile;
        }
        tl.debug("cwd (exclude root folder)= " + dirName);
        return { cwd: dirName, outStream: process.stdout as stream.Writable, errStream: process.stderr as stream.Writable };
    }

    private sevenZipArchive(archive: string, compression: string, files: string[]) {
        tl.debug('Creating archive with 7-zip: ' + archive);
        var sevenZip = tl.tool(this.getSevenZipLocation());
        sevenZip.arg('a');
        sevenZip.arg('-t' + compression);
        sevenZip.arg('-mx=5'); // normal compression (default)
        sevenZip.arg(archive);
    
        const fileList: string = this.createFileList(files);
        sevenZip.arg('@' + fileList);
    
        return this.handleExecResult(sevenZip.execSync(this.getOptions()), archive);
    }
    
    // Linux & Mac only
    private zipArchive(archive: string, files: string[]) {
        tl.debug('Creating archive with zip: ' + archive);
        var zip = tl.tool(tl.which('zip', true));
        zip.arg('-r');
        zip.arg('-q');
        zip.arg(archive);
        for (var i = 0; i < files.length; i++) {
            zip.arg(files[i]);
            console.log(tl.loc('Filename', files[i]));
        }
        return this.handleExecResult(zip.execSync(this.getOptions()), archive);
    }
    

    private handleExecResult(execResult: tr.IExecSyncResult, archive: string) {
        if (execResult.code != tl.TaskResult.Succeeded) {
            tl.debug('execResult: ' + JSON.stringify(execResult));
            throw new Error(tl.loc('ArchiveCreationFailedWithError', archive, execResult.code, execResult.stdout, execResult.stderr, execResult.error));
        }
    }

    /**
     * Handle zip archiving utility based on whether system is Windows vs Mac/Linux
     * @param files: files to be copied
     */
    private createArchive(files: string[]) {
        if (process.platform == 'win32') {
            this.sevenZipArchive(this.archiveFile, 'zip', files);
        }
        else {
            this.zipArchive(this.archiveFile, files);
        }
    }

    public async main() {
        try {
            tl.setResourcePath(path.join(__dirname, 'task.json'));
            
            // Replace existing archive if it exists
            if (tl.exist(this.archiveFile)) {
                try {
                    var stats: tl.FsStats = tl.stats(this.archiveFile);
                    if (stats.isFile()) {
                        console.log(tl.loc('RemoveBeforeCreation', this.archiveFile));
                        tl.rmRF(this.archiveFile);
                    } else {
                        throw new Error(tl.loc('ArchiveFileExistsButNotAFile', this.archiveFile));
                    }
                } catch (e) {
                    throw new Error(tl.loc('FailedArchiveFile', this.archiveFile, e));
                }
            }

            // Find matching archive files
            var files: string[] = this.findFiles();
            utils.reportArchivePlan(files).forEach(line => console.log(line));

            tl.debug(`Listing all ${files.length} files to archive:`);
            files.forEach(file => tl.debug(file));

            // Ensure output folder exists
            var destinationFolder = path.dirname(this.archiveFile);
            tl.debug("Checking for archive destination folder:" + destinationFolder);
            if (!tl.exist(destinationFolder)) {
                tl.debug("Destination folder does not exist, creating:" + destinationFolder);
                tl.mkdirP(destinationFolder);
            }

            this.createArchive(files);

            tl.setResult(tl.TaskResult.Succeeded, 'Successfully created archive: ' + this.archiveFile);
        } catch (err) {
            tl.debug(err.message);
            tl.error(err);
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    }
}