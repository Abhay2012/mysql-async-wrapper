/**
 * This is a Wrapper class, which helps to get rid of callbacks of mysql package functions 
 * and provides a way to use them in async await (es7) syntax
 * 
 * Just Import BaseDatabase class and create a custom class which extends BaseDatabase 
 * and pass pool in super (BaseDatabase class constructor)
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


class BaseDatabase {

    private _pool: any = null;
    private _connection: any = null;
    private _inTransaction: boolean = false;

    constructor(pool: any) {
        this._pool = pool;
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
     */
    public executeQuery(query: string, queryParams?: any) {

        return new Promise((resolve, reject) => {
            if (this._connection) {
                const queryString = this._connection.query(query, queryParams, (err: Error, result: any) => {

                    // Incase of Error and Connection in transaction rollback transaction and make inTransaction to Avoid auto commit on connection close
                    if (err) {
                        if (this._inTransaction) {
                            this._inTransaction = false;
                            this.rollback(() => {
                                reject(err);
                            });
                            return;
                        }
                        reject(err);
                        return;
                    }
                    resolve(result);
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
}

export default BaseDatabase;
