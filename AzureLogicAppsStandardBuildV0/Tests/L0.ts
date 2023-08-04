import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('AzureLogicAppsStandardBuild L0 Suite', function () {

    it('should copy and archive', function(done: Mocha.Done) {
        this.timeout(1000);

        let tp = path.join(__dirname, 'initTask.js');
        let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);

        tr.run();
        //console.log(tr.succeeded);
        //console.log(tr.stdout);
        assert.equal(tr.succeeded, true, 'should have succeeded');
        assert.equal(tr.warningIssues.length, 0, "should have no warnings");
        assert.equal(tr.errorIssues.length, 0, "should have no errors");
        
        console.log(tr.stdout);

        done();
    });
});