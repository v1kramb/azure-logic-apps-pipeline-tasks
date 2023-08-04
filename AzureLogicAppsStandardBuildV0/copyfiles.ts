// Adapted from => https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/CopyFilesV2/copyfiles.ts
import fs = require('fs');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');

export class FileCopier {
    private sourceFolder: string;

    constructor(sourceFolder: string) {
        this.sourceFolder = sourceFolder;
    }

    /**
     * Main method for copying.
     */
    public async Copy(): Promise<void> {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        const findOptions: tl.FindOptions = {
            allowBrokenSymbolicLinks: true,
            followSpecifiedSymbolicLink: true,
            followSymbolicLinks: true
        };

        let contents: string[] = ["**"]; // glob pattern matching - meant to match all paths in source directory
        let targetFolder: string = path.join(this.sourceFolder, "..", "_output"); // may be better to use format specific to Logic Apps or temporary UID

        this.sourceFolder = path.normalize(this.sourceFolder); // important for determing relative paths of files later on
        let allPaths: string[] = tl.find(this.sourceFolder, findOptions);
        let sourceFolderPattern = this.sourceFolder.replace('[', '[[]'); // remove characters which will affect string pattern matching
        let matchedPaths: string[] = tl.match(allPaths, contents, sourceFolderPattern); // currently doesn't ignore files in .funcignore
        let matchedFiles: string[] = this.filterOutDirectories(matchedPaths);

        if (matchedFiles.length > 0) {
            // Check that target folder doesn't already exist
            const targetFolderStats: fs.Stats = this.getPathStats(targetFolder);
            if (targetFolderStats)
                throw new Error(`Target folder ${targetFolder} already exists.`);

            console.log("Making target folder: " + targetFolder);
            this.makeDirP(targetFolder);

            try {
                let createdFolders: { [folder: string]: boolean } = {};
                for (let file of matchedFiles) {
                    let relativePath = file.substring(this.sourceFolder.length);
                    if (relativePath.startsWith(path.sep)) // trim leading separator if it exists
                        relativePath = relativePath.substring(1);

                    let targetPath = path.join(targetFolder, relativePath);
                    let targetDir = path.dirname(targetPath);

                    if (!createdFolders[targetDir]) {
                        this.makeDirP(targetDir);
                        createdFolders[targetDir] = true;
                    }

                    let targetStats: fs.Stats = this.getPathStats(targetPath);
                    if (targetStats && targetStats.isDirectory())
                        throw new Error(`Target "${targetPath}" is a directory`);
                    
                    if (targetStats) { // file already exists
                        console.log(tl.loc('FileAlreadyExistAt', file, targetPath));
                    }
                    else {
                        console.log(tl.loc('CopyingTo', file, targetPath));
                        tl.cp(file, targetPath);
                    }
                }
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, err);
            }
        }
    }

    /**
     * Filter out directories in paths which match contents.
     * @param paths path for which method will try to get `fs.Stats`.
     * @returns filtered out list of paths
     */
    private filterOutDirectories(paths: string[]): string[] {
        return paths.filter((path: string) => {
            const itemStats: fs.Stats = this.getPathStats(path);
            return !itemStats.isDirectory();
        });
    }

    /**
     * Gets stats for the provided path.
     * Will throw error if entry does not exist and `throwEnoent` is `true`.
     * @param path path for which method will try to get `fs.Stats`.
     * @returns `fs.Stats` or `null`
     */
    private getPathStats(path: string): fs.Stats {
        if (fs.existsSync(path)) {
            return fs.statSync(path);
        }
        else {
            const message: string = `Entry "${path}" does not exist`;
            tl.warning(message);
            throw new Error(message);
        }
    }

    /**
     * Creates full path for target folder with error handling.
     * @param targetFolder Target folder for source to be copied to.
     */
    private makeDirP(targetFolder: string) {
        try {
            tl.mkdirP(targetFolder);
        } catch (err) {
            throw err;
        }
    }
}