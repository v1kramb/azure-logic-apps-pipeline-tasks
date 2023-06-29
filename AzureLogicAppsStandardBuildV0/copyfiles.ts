// Adapted from: https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/CopyFilesV2/copyfiles.ts
import fs = require('fs');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');

export class CopyFiles {
    private sourceFolder: string;

    constructor(sourceFolder: string) {
        this.sourceFolder = sourceFolder;
    }

    /**
     * Gets stats for the provided path.
     * Will throw error if entry does not exist and `throwEnoent` is `true`.
     * @param path path for which method will try to get `fs.Stats`.
     * @returns `fs.Stats` or `null`
     */
    private stats(path: string): fs.Stats {
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
     * Filter out directories in paths which match contents.
     * @param paths path for which method will try to get `fs.Stats`.
     * @returns filtered out list of paths
     */
    private filterOutDirectories(paths: string[]): string[] {
        return paths.filter((path: string) => {
            const itemStats: fs.Stats = this.stats(path);
            return !itemStats.isDirectory();
        });
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

    public async main(): Promise<void> {
        tl.setResourcePath(path.join(__dirname, 'task.json'));

        const findOptions: tl.FindOptions = {
            allowBrokenSymbolicLinks: true,
            followSpecifiedSymbolicLink: true,
            followSymbolicLinks: true
        };

        let contents: string[] = ["**"]; // glob pattern matching - meant to match all paths in source directory
        let targetFolder: string = "project_output"; // likely better to append temporary UID in driver file

        this.sourceFolder = path.normalize(this.sourceFolder); // important for determing relative paths of files later on
        let allPaths: string[] = tl.find(this.sourceFolder, findOptions);
        let sourceFolderPattern = this.sourceFolder.replace('[', '[[]'); // remove characters which will affect string pattern matching
        let matchedPaths: string[] = tl.match(allPaths, contents, sourceFolderPattern); // currently doesn't ignore files in .funcignore
        let matchedFiles: string[] = this.filterOutDirectories(matchedPaths);

        if (matchedFiles.length > 0) {
            // Check that target folder doesn't already exist
            const targetFolderStats: fs.Stats = this.stats(targetFolder);
            if (targetFolderStats)
                throw new Error(`Target folder ${targetFolder} already exists.`);

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

                    let targetStats: fs.Stats = this.stats(targetPath);
                    if (targetStats && targetStats.isDirectory())
                        throw new Error(`Target "${targetPath}" is a directory`);
                    
                    // The below will overwrite whatever is in the target path
                    if (process.platform == 'win32' && targetStats && (targetStats.mode & 146) != 146) 
                        fs.chmodSync(targetPath, targetStats.mode | 146); // 146 => public read/write
                    
                    tl.cp(file, targetPath, "-f");
                }
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, err);
            }
        }
    }
}