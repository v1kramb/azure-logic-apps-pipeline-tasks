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
    private static sourceFolder: string ;
    //private static logicAppCIArtifactName: string | undefined;


    public static async main(): Promise<void> {
        try {
            // Set up localization
            tl.setResourcePath(path.join(__dirname, 'task.json'));

            // Get pre-defined variables
            this.buildId = tl.getVariable('Build.BuildId')!;
            this.defaultWorkingDir = tl.getVariable('System.DefaultWorkingDirectory')!;
            this.artifactStagingDir = tl.getVariable('Build.ArtifactStagingDirectory')!;  
            
            // Get input
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

        }
        catch (err) {
            tl.setResult(tl.TaskResult.Failed, err.message);
        }
    }

    // private static async copyFiles() {


    //     // const result = await tl.exec('CopyFiles@2', 
    //     //     {
    //     //         sourceFolder: this.sourceFolder, //path.join(this.defaultWorkingDir, this.sourceFolder),
    //     //         contents: '**', // everything
    //     //         targetFolder: 'project_output'
    //     //     });
        
    //     // if (result === tl.TaskResult.Failed) throw new Error(tl.loc("CopyFilesError"));
    //     console.log("Created project folder.");
    // }

    // private static async archiveFiles() {
    //     const result = await tl.exec('ArchiveFiles@2', 
    //         {
    //             rootFolderOrFile: this.sourceFolder, // path.join(this.defaultWorkingDir, 'project_output'),
    //             includeRootFolder: false,
    //             archiveType: 'zip',
    //             archiveFile: path.join(this.artifactStagingDir, this.buildId + '.zip'),
    //             replaceExistingArchive: true
    //         });
        
    //     if (result === tl.TaskResult.Failed) throw new Error(tl.loc('ArchiveFilesError'));
    //     console.log('Zipped project folder.');
    // }
}

AzureLogicAppsStandardBuild.main();