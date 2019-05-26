## Async Mysql Wrapper

This is a Wrapper class, which helps to get rid of callbacks of mysql package functions and provides a way to use them in async await (es7) syntax, Below Example uses express framework and import/export statements  

Import **BaseDatabase** class from **mysql-async-wrapper** and create a custom class which extends BaseDatabase and pass pool in super (BaseDatabase class constructor)

database.js
```javascript
import mysql from "mysql"
import BaseDatabase from "mysql-async-wrapper"

const pool = mysql.createPool({
    //pool configuration
})

class Database extends BaseDatabase{
    constructor(){
        super(pool);
    }
}

export default Database;
```

now in api controllers ( route handlers )

```javascript
import Database from "database.js";

async function controller(req, res, next){
    try{

        var db = new Database();
        const connetion = await db.getConnection();
        
        const empQuery = `Select * from Employees`;
        const empResult = await connection.executeQuery(empQuery, []);

        const deptQuery = `Select * from Departments`;
        const deptResult = await db.executeQuery(deptQuery, []); // directly db can also be used to execute queries

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
import Database from "database.js";

async function controller(req, res, next){
    try{

        var db = new Database();
        const connetion = await db.getConnection({ transaction: true }); // Will Begin Transaction
        
        const empQuery = `Insert into Employees (EmpID, Name) values (?,?)`;
        const empResult = await connection.executeQuery(empQuery, ["E02", "Abhay"]); // Incase of error auto rollback of transaction will be done

        const deptQuery = `Insert into Departments (DeptID, EmpID) values (?,?)`;
        const deptResult = await connection.executeQuery(deptQuery, ["D01", "E02"]); 

        db.commit();
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

        var db = new Database();
        const connetion = await db.getConnection(); 
        await db.beginTransaction(); // Will Begin Transaction
        
        const empQuery = `Insert into Employees (EmpID, Name) values (?,?)`;
        const empResult = await connection.executeQuery(empQuery, ["E02", "Abhay"]); 

        const deptQuery = `Insert into Departments (DeptID, EmpID) values (?,?)`;
        const deptResult = await connection.executeQuery(deptQuery, ["D01", "E02"]); 

        db.commit();
    }catch(err){
        db.rollback();
        next(err); 
    }finally{
        db.close(); 
    }
}
```
