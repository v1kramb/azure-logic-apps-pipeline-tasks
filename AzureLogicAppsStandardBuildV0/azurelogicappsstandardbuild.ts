import * as path from 'path';
import { CopyFiles } from './copyfiles';
import { ArchiveFiles } from './archivefiles';
import tl = require('azure-pipelines-task-lib/task');

export class AzureLogicAppsStandardBuild {
    // Azure DevOps
    private static buildId: string;
    private static defaultWorkingDir: string;
    private static artifactStagingDir: string;

    // Logic App
    private static sourceFolder: string;

    public static async main(): Promise<void> {
        try {
            // Set up localization
            tl.setResourcePath(path.join(__dirname, 'task.json'));

            // Get pre-defined variables
            this.buildId = tl.getVariable('Build.BuildId')!;
            this.defaultWorkingDir = tl.getVariable('System.DefaultWorkingDirectory')!;
            this.artifactStagingDir = tl.getVariable('Build.ArtifactStagingDirectory')!;  
            
            // Get input for source folder
            this.sourceFolder = tl.getPathInputRequired('sourceFolder');

            // Copy files
            const fileCopier = new CopyFiles(this.sourceFolder);
            try {
                fileCopier.main();
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, err);
            }
            console.log("Copied files.");

            // Archive files
            const fileArchiver = new ArchiveFiles(this.defaultWorkingDir, this.artifactStagingDir, this.buildId);
            try {
                fileArchiver.main();
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, err);
            }
            console.log("Archived files.");
        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    }
}

AzureLogicAppsStandardBuild.main();