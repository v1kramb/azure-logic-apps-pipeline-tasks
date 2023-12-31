// Used in archivefiles.ts
import tl = require("azure-pipelines-task-lib/task");

/**
 * Returns "plan" of archiver describing which files have been found - helpful for debugging.
 * @returns array of readable strings representing what is being archived
 */
export function reportArchivePlan(files: string[], max: number=10) : string[] {
    var plan: string[] = [];
    plan.push(tl.loc('FoundNFiles', files.length));
    if (files.length > 0) {
        var limit = Math.min(files.length, max);
        for (var i = 0; i < limit; i++) {
            plan.push(tl.loc('ArchivingFile', files[i]));
        }
        if (files.length > max) {
            plan.push(tl.loc('MoreFiles', files.length - max));
        }
    }
    return plan;
}