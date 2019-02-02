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
 * Incase of closing connection and connection is in transaction then it will automatically 
 * get commit 
 */

interface IConfiguration {
    transaction?: boolean;
}

class BaseDatabase {

    protected pool: any = null;
    protected connection: any = null;
    protected inTransaction: boolean = false;

    constructor(pool: any) {
        this.pool = pool;
    }

    public getConnection(configuration: IConfiguration = {}) {
        return new Promise((resolve, reject) => {
            this.pool.getConnection(async (err: any, connection: any) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.connection = connection;
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
            this.connection.beginTransaction((err: Error) => {
                if (err) {
                    reject(err);
                    return;
                }
                this.inTransaction = true;
                resolve();
            });
        })
    }

    public executeQuery(query: string, queryParams: any) {

        return new Promise((resolve, reject) => {
            if (this.connection) {
                const queryString = this.connection.query(query, queryParams, (err: Error, result: any) => {

                    // Incase of Error and Connection in transaction rollback transaction and make inTransaction to Avoid auto commit on connection close
                    if (err) {
                        if (this.inTransaction) {
                            this.inTransaction = false;
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

    public commit() {
        return new Promise((resolve, reject) => {
            if (this.connection && this.inTransaction) {
                // In case of error in commit then rollback transaction
                this.connection.commit((err: Error) => {
                    if (err) {
                        this.rollback();
                        reject(err);
                        return;
                    }
                    // after committing close transaction
                    this.inTransaction = false;
                    resolve();
                });
            } else {
                reject(new Error("Connection or Transaction Doesn't Exist"));
            }
        })
    }

    public rollback(cb?: any) {
        if (this.connection) {
            this.inTransaction = false;
            this.connection.rollback((err: Error) => {
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

    public async close() {
        if (this.connection) {
            // If Connection is inTransaction auto commit Transaction
            if (this.inTransaction) {
                await this.commit();
            }
            this.connection.release();
            this.connection = null;
        }
    }
}

export default BaseDatabase;
