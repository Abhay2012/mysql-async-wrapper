/**
 * This is a Wrapper class, which helps to get rid of callbacks of mysql package functions 
 * and provides a way to use them in async await (es7) syntax
 * 
 * Just Import BaseDatabase class and create an instance of it by passing pool as 1st parameter
 * configuration in 2nd parameter
 * 
 * It supports retry query execution also, by passing maxRetryCount and retryErrorCodes in 
 * configuration while creating db instance
 * 
 * To BeginTransaction Just pass transaction true in options while calling getConnection,
 * or if required beginTransaction function can be called separately
 * 
 * Incase of Error in Executing Query and connection is in transaction then it will automatically 
 * get rollback
 *  
 */

interface IConnectionConfig {
    transaction?: boolean;
}

/**
 * @description Database Configuration
 * @param maxRetryCount Number of Retries in case of errors
 * @param retryErrorCodes Pass Array of Error Codes like ER_LOCK_DEADLOCK, ERR_LOCK_WAIT_TIMEOUT
 */
interface IDBConfig {
    maxRetryCount?: number;
    retryErrorCodes?: string[];
}

class BaseDatabase {

    private _pool: any = null;
    private _connection: any = null;
    private _inTransaction: boolean = false;

    private _maxRetryCount: number = 0;
    private _retryErrorCodes: string[] = [];
    constructor(pool: any, dbConfig: IDBConfig = {}) {
        this._pool = pool;
        this._maxRetryCount = dbConfig.maxRetryCount || 0; 
        this._retryErrorCodes = dbConfig.retryErrorCodes || [];
    }

    /**
     * @description To Create Connection
     * @param configuration Config Object, right now supports only transaction key
     * if transaction is passed as true then connection with transaction will be created
     */
    public getConnection(configuration: IConnectionConfig = {}) {
        return new Promise((resolve, reject) => {
            this._pool.getConnection(async (err: any, connection: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                this._connection = connection;
                if (configuration.transaction) {
                    try {
                        const beginTransaction = await this.beginTransaction();
                        resolve(this);
                    } catch (err) {
                        reject(err);
                    }
                } else {
                    resolve(this);
                }
            });
        })
    }

    public beginTransaction() {
        return new Promise((resolve, reject) => {
            this._connection.beginTransaction((err: Error) => {
                if (err) {
                    reject(err);
                    return;
                }
                this._inTransaction = true;
                resolve();
            });
        })
    }

    /**
     * @description To Execute DB Query, In case of Error and Connecton in transaction auto rollback will be called
     * @param query {required} Query String
     * @param queryParams {optional} Query Array
     * @param retryErrorCodes {optional} Array of Error Codes in which you want to retry for this query 
     */
    public executeQuery(query: string, queryParams?: any, retryErrorCodes?: string[]) {

        return new Promise((resolve, reject) => {
            if (this._connection) {

                this._executeQuery(query, queryParams, this._retryErrorCodes.concat(retryErrorCodes), 0).then(result => {
                    
                    resolve(result);

                }).catch(err => {
                    // In case of Error in Query and connection is in transaction rollback
                    if (this._inTransaction) {
                        this._inTransaction = false;
                        this.rollback(() => {
                            reject(err);
                        });
                        return;
                    }
                    reject(err);

                });

            } else {
                reject(new Error("Connection Doesn't Exist"));
            }
        });
    }

    // To Commit Transaction
    public commit() {
        return new Promise((resolve, reject) => {
            if (this._connection && this._inTransaction) {
                // In case of error in commit then rollback transaction
                this._connection.commit((err: Error) => {
                    if (err) {
                        this.rollback();
                        reject(err);
                        return;
                    }
                    // after committing close transaction
                    this._inTransaction = false;
                    resolve();
                });
            } else {
                reject(new Error("Connection or Transaction Doesn't Exist"));
            }
        })
    }

    // To Roll back transaction 
    public rollback(cb?: any) {
        if (this._connection && this._inTransaction) {
            this._inTransaction = false;
            this._connection.rollback((err: Error) => {
                if (err) {
                    if (cb) {
                        cb(err);
                    }
                    return;
                }
                if (cb) {
                    cb(null);
                }
            });
        } else {
            if (cb) {
                cb(new Error("Connection Doesn't Exist"));
            }
        }
    }

    // To Release Connection Back To Pool
    public close() {
        if (this._connection) {
            this._connection.release();
            this._connection = null;
        }
    }

    // Executes Query and Retry retryCount times if error code is present in retryErrorCodes
    private _executeQuery(query: string, queryParams: any, retryErrorCodes: string[], retryCount: number){
        return new Promise((resolve, reject) => {
            const queryString = this._connection.query(query, queryParams, async (err: any, result: any) => {

                // Incase of Error and Connection in transaction rollback transaction and make inTransaction to Avoid auto commit on connection close
                if (err) {
                    const retryCheck = retryErrorCodes.findIndex((item) => item === err.code) > -1;

                    if(retryCheck && retryCount <= this._maxRetryCount){
                        try{
                            
                            const retryResult = await this._executeQuery(query, queryParams, retryErrorCodes, retryCount + 1);
                            resolve(retryResult);

                        }catch(err){
                            reject(err);
                        }
                    }else{
                        reject(err);
                    }
                }else{
                    resolve(result);
                }
            });
        })
    }
}

export default BaseDatabase;
