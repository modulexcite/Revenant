/**
 * Created by JiaHao on 19/8/15.
 */

var async = require('async');
var Q = require('q');

var base = require('./base');

function Revenant() {
    this.initQueue();
}

Revenant.prototype = {
    constructor: Revenant,

    initQueue: function () {
        var self = this;
        const QUEUE_CONCURRENCY = 1;

        self.taskQueue = async.queue(function(parameters, callback) {

            var task = parameters.task;
            var arguments = parameters.argument;

            if (task === base.openPage) {
                task(arguments, function (error, page, ph) {
                    self.phantom = ph;
                    self.page = page;

                    if (error) {
                        callback(error);
                        return;
                    }
                    callback();
                });
            } else {

                if (!self.page) {
                    callback('Page is not open');
                    return;
                }

                var taskArguments = [self.page, self.phantom, arguments, function (error, page, ph, result) {
                    callback(error, result);
                }];

                // removes any null elements from the list
                taskArguments = taskArguments.filter(function (element) {
                    return !!element;
                });

                task.apply(this, taskArguments);

            }

        }, QUEUE_CONCURRENCY);
    },

    /**
     * Private helper function to push a task
     * @param task
     * @param argument
     * @param callback
     * @private
     */
    __pushTask: function (task, argument, callback) {
        var self = this;

        var deferred = Q.defer();

        var queueArgument = {
            task: task,
            argument: argument
        };

        self.taskQueue.push(queueArgument, function (error, result) {
            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve(result);
            }
        });

        return deferred.promise.nodeify(callback);

    },

    openPage: function (url, callback) {
        return this.__pushTask(base.openPage, url, callback);
    },

    takeSnapshot: function(callback) {
        return this.__pushTask(base.takeSnapshot, null, callback);
    },

    waitForElement: function (selector, callback) {
        return this.__pushTask(base.elementExists, selector, callback);
    },

    getInnerHTML: function (selector, callback) {
        return this.__pushTask(base.getInnerHtmlFromElement, selector, callback);
    },

    fillForm: function (selector, value, callback) {
        return this.__pushTask(base.fillForm, [selector, value], callback);
    },

    getSelectorValue: function (selector, callback) {
        return this.__pushTask(base.getSelectorValue, selector, callback);
    },

    submitForm: function (callback) {
        return this.__pushTask(base.submitForm, null, callback);
    },

    /**
     * Kills the phantom process. Does nothing if it has not been started initially
     */
    done: function () {
        // Guard to prevent duplicate call of .exit();
        if (this.phantom) {
            this.phantom.exit();
            this.page = null;
            this.phantom = null;
        }
    }
};

module.exports = Revenant;