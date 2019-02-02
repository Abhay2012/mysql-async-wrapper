## Async Mysql Wrapper

This is a Wrapper class, which helps to get rid of callbacks of mysql package functions and provides a way to use them in async await (es7) syntax, Below Example uses express framework and import/export statements  

Just Import **BaseDatabase** class and create a custom class which extends BaseDatabase and pass pool in super (BaseDatabase class constructor)

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

now in your api controllers ( route handlers )

```javascript
import Database from "database.js";

async function controller(req, res, next){
    try{

        const db = new Database();
        const connetion = await db.getConnection();
        
        const empQuery = `Select * from Employees`;
        const empResult = await connection.executeQuery(empQuery, []);

        const deptQuery = `Select * from Departments`;
        const deptResult = await db.executeQuery(deptQuery, []); 

    }catch(err){
        next(err); 
    }finally{
        db.close(); // To Release Connection
    }
}
```