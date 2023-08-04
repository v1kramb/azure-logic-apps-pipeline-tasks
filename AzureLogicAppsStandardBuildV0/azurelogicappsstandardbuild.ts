import * as path from 'path';
import { FileCopier } from './copyfiles';
import { FileArchiver } from './archivefiles';
import tl = require('azure-pipelines-task-lib/task');

export class AzureLogicAppsStandardBuild {
    // Azure DevOps
    private static buildId: string;
    private static defaultWorkingDir: string;
    private static artifactStagingDir: string;

    // Logic Apps
    private static sourceFolder: string;
    private static archiveFile: string | undefined;

    public static async main(): Promise<void> {
        try {
            console.log("HERE2");
            // Set up localization
            tl.setResourcePath(path.join(__dirname, 'task.json'));

            // Get pre-defined variables
            this.buildId = tl.getVariable('Build.BuildId')!;
            this.defaultWorkingDir = tl.getVariable('System.DefaultWorkingDirectory')!;
            this.artifactStagingDir = tl.getVariable('Build.ArtifactStagingDirectory')!;  
            
            // Get input for source folder
            this.sourceFolder = tl.getPathInputRequired('sourceFolder');
            this.archiveFile = tl.getPathInput('archiveFile');

            console.log("HERE");

            // Copy files
            const fileCopier = new FileCopier(this.sourceFolder);
            try {
                fileCopier.Copy();
            } catch (err) {
                tl.setResult(tl.TaskResult.Failed, err);
            }
            console.log("Copied files.");
            console.log("Really");

            // Archive files
            const fileArchiver = new FileArchiver(this.defaultWorkingDir, this.archiveFile, this.artifactStagingDir, this.buildId);
            try {
                fileArchiver.Archive();
            } catch (err) {
                console.log("failed archiver");
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