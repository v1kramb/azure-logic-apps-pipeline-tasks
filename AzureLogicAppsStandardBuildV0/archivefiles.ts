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

    private rootFolderOrFile: string;
    private archiveFile: string;

    constructor(defaultWorkingDir: string, stagingDir: string, buildId: string) {
        this.defaultWorkingDir = defaultWorkingDir;
        this.stagingDir = stagingDir;
        this.buildId = buildId;

        this.rootFolderOrFile = this.makeAbsolute(path.normalize(path.join(
            this.defaultWorkingDir, 'project_output'
        ).trim()));

        this.archiveFile = path.normalize(path.join(this.stagingDir, this.buildId + '.zip').trim());
    }

    private findFiles(): string[] {
        var fullPaths: string[] = tl.ls('-A', [this.rootFolderOrFile]);
        var baseNames: string[] = [];
        for (var i = 0; i < fullPaths.length; i++) {
            baseNames[i] = path.basename(fullPaths[i]);
        }
        return baseNames;
    }

    private makeAbsolute(normalizedPath: string): string {
        tl.debug('makeAbsolute:' + normalizedPath);
    
        var result = normalizedPath;
        if (!path.isAbsolute(normalizedPath)) {
            result = path.join(this.defaultWorkingDir, normalizedPath);
            tl.debug('Relative file path: ' + normalizedPath + ' resolving to: ' + result);
        }
        return result;
    }

    function createFileList(files: string[]): string {
        const tempDirectory: string = tl.getVariable('Agent.TempDirectory');
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
    
    function getOptions(): tr.IExecSyncOptions {
        var dirName: string;
        if (includeRootFolder) {
            dirName = path.dirname(rootFolderOrFile);
            tl.debug("cwd (include root folder)= " + dirName);
            return { cwd: dirName, outStream: process.stdout as stream.Writable, errStream: process.stderr as stream.Writable };
        } else {
            var stats: tl.FsStats = tl.stats(rootFolderOrFile);
            if (stats.isFile()) {
                dirName = path.dirname(rootFolderOrFile);
            } else {
                dirName = rootFolderOrFile;
            }
            tl.debug("cwd (exclude root folder)= " + dirName);
            return { cwd: dirName, outStream: process.stdout as stream.Writable, errStream: process.stderr as stream.Writable };
        }
    }

    function sevenZipArchive(archive: string, compression: string, files: string[]) {
        tl.debug('Creating archive with 7-zip: ' + archive);
        var sevenZip = tl.tool(getSevenZipLocation());
        sevenZip.arg('a');
        sevenZip.arg('-t' + compression);
        if (verbose) {
            // Set highest logging level
            sevenZip.arg('-bb3');
        }
    
        const sevenZipCompression = tl.getInput('sevenZipCompression', false);
        if (sevenZipCompression) {
            sevenZip.arg('-mx=' + mapSevenZipCompressionLevel(sevenZipCompression));
        }
    
        sevenZip.arg(archive);
    
        const fileList: string = createFileList(files);
        sevenZip.arg('@' + fileList);
    
        return handleExecResult(sevenZip.execSync(getOptions()), archive);
    }
    
    // map from YAML-friendly value to 7-Zip numeric value
    function mapSevenZipCompressionLevel(sevenZipCompression: string) {    
        switch (sevenZipCompression.toLowerCase()) {
            case "ultra":
                return "9";
            case "maximum":
                return "7";
            case "normal":
                return "5";
            case "fast":
                return "3";
            case "fastest":
                return "1";
            case "none":
                return "0";
            default:
                return "5";
        }
    }
    
    // linux & mac only
    function zipArchive(archive: string, files: string[]) {
        tl.debug('Creating archive with zip: ' + archive);
        if (typeof xpZipLocation == "undefined") {
            xpZipLocation = tl.which('zip', true);
        }
        var zip = tl.tool(xpZipLocation);
        zip.arg('-r');
        // Verbose gets priority over quiet
        if (verbose) {
            zip.arg('-v');
        }
        else if (quiet) {
            zip.arg('-q');
        }
        zip.arg(archive);
        for (var i = 0; i < files.length; i++) {
            zip.arg(files[i]);
            console.log(tl.loc('Filename', files[i]));
        }
        return handleExecResult(zip.execSync(getOptions()), archive);
    }
    

    private handleExecResult(execResult, archive) {
        if (execResult.code != tl.TaskResult.Succeeded) {
            tl.debug('execResult: ' + JSON.stringify(execResult));
            throw new Error(tl.loc('ArchiveCreationFailedWithError', archive, execResult.code, execResult.stdout, execResult.stderr, execResult.error));
        }
    }

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
            // tl.setResourcePath(path.join(__dirname, 'task.json'));
            if (tl.exist(this.archiveFile)) {
                try {
                    var stats: tl.FsStats = tl.stats(archiveFile);
                    if (stats.isFile()) {
                        console.log(tl.loc('RemoveBeforeCreation', archiveFile));
                        tl.rmRF(this.archiveFile);
                    } else {
                        throw new Error('ArchiveFileExistsButNotAFile');
                    }
                } catch (e) {
                    throw new Error('FailedArchiveFile');
                }
            }

            // Find matching archive files
            var files: string[] = this.findFiles();
            utils.reportArchivePlan(files).forEach(line => console.log(line));

            tl.debug(`Listing all ${files.length} files to archive:`);
            files.forEach(file => tl.debug(file));

            //ensure output folder exists
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