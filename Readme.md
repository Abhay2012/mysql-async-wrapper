## Async Mysql Wrapper

This is a Wrapper class, which helps to get rid of callbacks of mysql package functions and provides a way to use them in async await (es7) syntax, Below Examples uses express framework in both (import/export syntax and commonJs syntax)

It also supports retry query execution for provided error codes

Import **BaseDatabase** class from **mysql-async-wrapper**, create a db instance with pool and export it 

database.js (import/export syntax)
```javascript
import mysql from "mysql"
import BaseDatabase from "mysql-async-wrapper"

const pool = mysql.createPool({
    //pool configuration
})

const db = new BaseDatabase(pool);
export default db;
```

database.js (commonJs Syntax)
```javascript
const mysql = require("mysql");
const BaseDatabase = require("mysql-async-wrapper").default; // you need to add default (it's a typescript compiler issue)

const pool = mysql.createPool({
    //pool configuration
})

const db = new BaseDatabase(pool);
module.exports = db;
```

to retry query execution in case of error pass configuration object while creating db instance like below
```javascript

const maxRetryCount = 3; // Number of Times To Retry
const retryErrorCodes = ["ER_LOCK_DEADLOCK", "ERR_LOCK_WAIT_TIMEOUT"] // Retry On which Error Codes 

const db = new BaseDatabase(pool, {
    maxRetrCount,
    retryErrorCodes
})

```

now in api controllers ( route handlers )

```javascript
import db from "database.js"; // const db = require("database.js") in case of commonJS

async function controller(req, res, next){
    try{

        const connetion = await db.getConnection();
        
        const empQuery = `Select * from Employees`;
        const empResult = await connection.executeQuery(empQuery, []);

        const deptQuery = `Select * from Departments`;
        const deptResult = await connection.executeQuery(deptQuery, []);

    }catch(err){
        next(err); 
    }finally{
        db.close(); // To Release Connection
    }
}
```

* To begin transaction pass transaction true in options while calling getConnection </br>
* Incase of **error** during query executing  and connection is in transaction then it will **automatically get rollback**
* But To rollback transaction in case of errors other than query errors please use **rollback in catch block**

```javascript
import db from "database.js";

async function controller(req, res, next){
    try{

        const connection = await db.getConnection({ transaction: true }); // Will Begin Transaction
        
        const empQuery = `Insert into Employees (EmpID, Name) values (?,?)`;
        const empResult = await connection.executeQuery(empQuery, ["E02", "Abhay"]); // Incase of error auto rollback of transaction will be done

        const deptQuery = `Insert into Departments (DeptID, EmpID) values (?,?)`;
        const deptResult = await connection.executeQuery(deptQuery, ["D01", "E02"]); 

        await db.commit();
    }catch(err){
        db.rollback(); // to rollback in case of errors other than query error
        next(err); 
    }finally{
        db.close(); 
    }
}
```

If Required Transaction can be begin using beginTransaction
```javascript
async function controller(req, res, next){
    try{

        const connection = await db.getConnection(); 

        const getEmpQuery = `Select EmpID, Name from Employees where EmpID = ?`;
        const getEmpResult = await connection.executeQuery(empQuery, ["E01"]); 


        await db.beginTransaction(); // Will Begin Transaction
        
        const empQuery = `Insert into Employees (EmpID, Name) values (?,?)`;
        const empResult = await connection.executeQuery(empQuery, ["E02", "Abhay"]); 

        const deptQuery = `Insert into Departments (DeptID, EmpID) values (?,?)`;
        const deptResult = await connection.executeQuery(deptQuery, ["D01", "E02"]); 

        await db.commit();
    }catch(err){
        db.rollback();
        next(err); 
    }finally{
        db.close(); 
    }
}
```

you can also use retry for specific error codes for particular query only 
```javascript

const empQuery = `Insert into Employees (EmpID, Name) values (?,?)`;
const empResult = await connection.executeQuery(empQuery, ["E02", "Abhay"], ["ER_LOCK_DEADLOCK"]); // by simply passing array of error codes as 3 parameter of execute query

```
