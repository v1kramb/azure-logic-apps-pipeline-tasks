// Adapted from: https://github.com/microsoft/azure-pipelines-tasks/blob/master/Tasks/CopyFilesV2/copyfiles.ts
import fs = require('fs');
import path = require('path');
import tl = require('azure-pipelines-task-lib/task');

/*
SourceFolder
Contents: '**'
TargetFolder
#CleanTargetFolder: false
#OverWrite: false
#flattenFolders: false
#preserveTimestamp: false
#retryCount: '0'
#delayBetweenRetries: '1000''
#ignoreMakeDirErrors: false
*/

export class CopyFiles {
    private sourceFolder: string;

    constructor(sourceFolder: string) {
        this.sourceFolder = sourceFolder;
    }

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

    private filterOutDirectories(paths: string[]): string[] {
        return paths.filter((path: string) => {
            const itemStats: fs.Stats = this.stats(path);
            return !itemStats.isDirectory();
        });
    }

    private makeDirP(targetFolder: string) {
        try {
            tl.mkdirP(targetFolder);
        } catch (err) {
            throw err;
        }
    }

    public async main(): Promise<void> {
        // tl.setResourcePath(path.join(__dirname, 'task.json'));

        const findOptions: tl.FindOptions = {
            allowBrokenSymbolicLinks: true,
            followSpecifiedSymbolicLink: true,
            followSymbolicLinks: true
        };

        let contents: string[] = ["**"];
        let targetFolder: string = "project_output"; // TODO: may be better to set up temporary UID

        this.sourceFolder = path.normalize(this.sourceFolder);
        let allPaths: string[] = tl.find(this.sourceFolder, findOptions);
        let sourceFolderPattern = this.sourceFolder.replace('[', '[[]');
        let matchedPaths: string[] = tl.match(allPaths, contents, sourceFolderPattern); // TODO: add functionality to ignore files in .funcignore, if it exists
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
                    if (relativePath.startsWith(path.sep))
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
                    
                    if (process.platform == 'win32' && targetStats && (targetStats.mode & 146) != 146) 
                        fs.chmodSync(targetPath, targetStats.mode | 146);
                    
                    tl.cp(file, targetPath, "-f");
                }
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, err);
            }
        }
    }
}