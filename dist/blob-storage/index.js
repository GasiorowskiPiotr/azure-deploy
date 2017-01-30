"use strict";
var azure_storage_1 = require("azure-storage");
var glob = require("glob");
var path = require("path");
var prepareOptions = function (options) {
    var connectionString = options.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    var storageAccount = options.storageAccount || process.env.AZURE_STORAGE_ACCOUNT;
    var storageKey = options.storageKey || process.env.AZURE_STORAGE_ACCESS_KEY;
    return Object.assign({}, options, { connectionString: connectionString, storageAccount: storageAccount, storageKey: storageKey });
};
var prepareBlobService = function (options) {
    if (options.connectionString) {
        return azure_storage_1.createBlobService(options.connectionString);
    }
    else if (options.storageAccount && options.storageKey) {
        return azure_storage_1.createBlobService(options.storageAccount, options.storageKey);
    }
    else {
        return azure_storage_1.createBlobService();
    }
};
var uploadFile = function (service, file, container, version) {
    return new Promise(function (resolve, reject) {
        service.createBlockBlobFromLocalFile(container, version + '/' + path.basename(file), file, function (err, res) {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
};
var ensureContainer = function (service, container, version) {
    return new Promise(function (resolve, reject) {
        service.createContainerIfNotExists(container, function (err, res) {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        });
    });
};
var deploy = function (options, callback) {
    var fullOptions = prepareOptions(options);
    if (fullOptions.debug) {
        console.log("Options prepared for Blob deployment: ", JSON.stringify(fullOptions));
    }
    var blobService = prepareBlobService(fullOptions);
    var version = require(path.join(process.cwd(), "package.json")).version;
    glob(options.fileMask, function (err, files) {
        if (err) {
            console.error(err);
        }
        else {
            if (files.length > 0) {
                var promise = ensureContainer(blobService, options.container, version);
                var _loop_1 = function (i) {
                    var file = files[i];
                    promise = promise.then(function () {
                        return uploadFile(blobService, file, options.container, version);
                    });
                };
                for (var i = 0; i < files.length; i++) {
                    _loop_1(i);
                }
                promise.then(function () {
                    console.log('All files uploaded successfully');
                }, function (err) {
                    console.error('Sending file not succeeded due to the error', err);
                });
            }
        }
    });
};
(function () {
    var simpleHandler = function (k, prop, parser) {
        return function (key, value, options) {
            if (key === k) {
                options[prop] = value;
            }
        };
    };
    var connStrHandler = function (key, value, options) {
        return simpleHandler('--connStr', 'connectionString')(key, value, options);
    };
    var fileMaskHandler = function (key, value, options) {
        return simpleHandler('--fileMask', 'fileMask')(key, value, options);
    };
    var debugHandler = function (key, value, options) {
        return simpleHandler('--debug', 'debug', function (d) { return JSON.parse(d); })(key, value, options);
    };
    var storageAccountHandler = function (key, value, options) {
        return simpleHandler('--storageAccount', 'storageAccount')(key, value, options);
    };
    var storageKeyHandler = function (key, value, options) {
        return simpleHandler('--storageKey', "storageKey")(key, value, options);
    };
    var containerHAndler = function (key, value, options) {
        return simpleHandler('--container', "container")(key, value, options);
    };
    var options = {};
    for (var i = 2; i < process.argv.length - 1; i++) {
        connStrHandler(process.argv[i], process.argv[i + 1], options);
        fileMaskHandler(process.argv[i], process.argv[i + 1], options);
        debugHandler(process.argv[i], process.argv[i + 1], options);
        storageAccountHandler(process.argv[i], process.argv[i + 1], options);
        storageKeyHandler(process.argv[i], process.argv[i + 1], options);
        containerHAndler(process.argv[i], process.argv[i + 1], options);
    }
    deploy(options, function () {
        process.exit(0);
    });
})();
//# sourceMappingURL=index.js.map