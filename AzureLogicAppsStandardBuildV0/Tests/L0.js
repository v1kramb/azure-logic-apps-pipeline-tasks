"use strict";
exports.__esModule = true;
var path = require("path");
var assert = require("assert");
var ttm = require("azure-pipelines-task-lib/mock-test");
describe('AzureLogicAppsStandardBuild L0 Suite', function () {
    it('should copy and archive', function (done) {
        this.timeout(1000);
        var tp = path.join(__dirname, 'initTask.js');
        var tr = new ttm.MockTestRunner(tp);
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
