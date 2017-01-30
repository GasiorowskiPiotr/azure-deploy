import { BlobService, createBlobService } from 'azure-storage';
import * as glob from 'glob';
import * as path from 'path';

export interface Options {
    connectionString?: string;
    fileMask?: string;
    debug?: boolean;
    storageAccount?: string;
    storageKey?: string;
    container: string;
}

const prepareOptions = (options: Options): Options => {

    const connectionString = options.connectionString || process.env.AZURE_STORAGE_CONNECTION_STRING;
    const storageAccount = options.storageAccount || process.env.AZURE_STORAGE_ACCOUNT;
    const storageKey = options.storageKey || process.env.AZURE_STORAGE_ACCESS_KEY;

    return Object.assign({}, options, { connectionString, storageAccount, storageKey });
}

const prepareBlobService = (options: Options): BlobService => {

    if(options.connectionString) {
        return createBlobService(options.connectionString);
    } else if(options.storageAccount && options.storageKey) {
        return createBlobService(options.storageAccount, options.storageKey);
    } else {
        return createBlobService();
    }
}

const uploadFile = (service: BlobService, file: string, container: string, version: string) => {
    
    return new Promise((resolve, reject) => {
        service.createBlockBlobFromLocalFile(container, version + '/' + path.basename(file), file, (err, res) => {
            if(err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });  
};

const ensureContainer = (service: BlobService, container: string, version: string) => {

    return new Promise((resolve, reject) => {
        service.createContainerIfNotExists(container, (err, res) => {
            if(err) {
                reject(err);
            } else {
                resolve(res);
            }
        })
    });

};

const deploy = (options: Options, callback: () => void) => {

    const fullOptions = prepareOptions(options);
    if(fullOptions.debug) {
        console.log("Options prepared for Blob deployment: ", JSON.stringify(fullOptions));
    }

    const blobService = prepareBlobService(fullOptions);

    const version = require(path.join(process.cwd(), "package.json")).version;

    glob(options.fileMask, (err: Error, files: string[]) => {

        if(err) {
            console.error(err);
        } else {

            if(files.length > 0) {
                let promise = ensureContainer(blobService, options.container, version);

                for(let i = 0; i < files.length; i++) {
                    const file = files[i];
                    promise = promise.then<any>(() => {
                        return uploadFile(blobService, file, options.container, version);
                    });
                }

                promise.then(() => {
                    console.log('All files uploaded successfully');
                },(err) => {
                    console.error('Sending file not succeeded due to the error', err );
                });

            }
        }
    });

}

(() => {

    const simpleHandler = (k: string, prop: string, parser?: (str: string) => any) => {
        return (key: string, value: string, options: Options) => {
            if(key === k) {
                options[prop] = value;
            }
        }
    };

    const connStrHandler = (key: string, value: string, options: Options) => {
        return simpleHandler('--connStr', 'connectionString')(key, value, options);
    };

    const fileMaskHandler = (key: string, value: string, options: Options) => {
        return simpleHandler('--fileMask', 'fileMask')(key, value, options);
    };

    const debugHandler = (key: string, value: string, options: Options) => {
        return simpleHandler('--debug', 'debug', (d) => JSON.parse(d))(key, value, options);
    };

    const storageAccountHandler = (key: string, value: string, options: Options) => {
        return simpleHandler('--storageAccount', 'storageAccount')(key, value, options);
    };

    const storageKeyHandler = (key: string, value: string, options: Options) => {
        return simpleHandler('--storageKey', "storageKey")(key, value, options);
    };  

    const containerHAndler = (key: string, value: string, options: Options) => {
        return simpleHandler('--container', "container")(key, value, options);
    };

    const options = { } as Options;

    for(let i = 2; i < process.argv.length - 1; i++) {

        connStrHandler(process.argv[i], process.argv[i+1], options)
        fileMaskHandler(process.argv[i], process.argv[i+1], options);
        debugHandler(process.argv[i], process.argv[i+1], options);
        storageAccountHandler(process.argv[i], process.argv[i+1], options);
        storageKeyHandler(process.argv[i], process.argv[i+1], options);
        containerHAndler(process.argv[i], process.argv[i+1], options);
    }

    deploy(options, () => {
        process.exit(0);
    });

})();