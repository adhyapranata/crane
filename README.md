# Crane: React Native SQLite Query Builder

[![Crane](./banner.png)](https://github.com/adhyapranata/crane)

[![Code Climate](https://img.shields.io/codeclimate/maintainability/adhyapranata/crane.svg)](https://codeclimate.com/github/adhyapranata/crane)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Crane is a query builder for React Native extracted from Laravel's [illuminate/database](https://github.com/illuminate/database).
This library supports both [react-native-sqlite-storage](https://github.com/andpor/react-native-sqlite-storage) and [expo sqlite](https://docs.expo.io/versions/latest/sdk/sqlite/).  

## Table of Contents

- [Demo](#demo)
- [Installation](#installation)
- [Getting Started](#getting-started)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Support + Feedback](#support--feedback)
- [Thank You](#thank-you)
- [License](#license)

## Demo
For a demo, [click here](https://github.com/adhyapranata/crane-expo-demo).

## Installation 

Crane *requires* SQLite driver in order to work.

If you are using expo, install the `expo-sqlite`
```bash
expo install expo-sqlite
```

If you are using bare React Native, install the `react-native-sqlite-storage`. For detail instruction, please refer to the package [documentation](https://github.com/andpor/react-native-sqlite-storage)
```bash
yarn add react-native-sqlite-storage
```

Finally, install `crane`

```bash
yarn add git+https://git@github.com:adhyapranata/crane.git#0.2.4
```

## Getting Started

### For Expo
```javascript
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Asset } from 'expo-asset';
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import Builder, { DB } from 'crane'; // Import the library


export default function App() {
  useEffect(() => {
    testDB();
  }, []);

  return (
    <View style={styles.container}>
      <Text>Open up App.js to start working on your app!</Text>
    </View>
  );
}

export async function testDB() {
  await initDB();
  await getAlbums();
}

export async function initDB() {
  await testDriver();
  await loadDB();
}

export async function testDriver() {
  const dummy = SQLite.openDatabase('dummy.db');

  try {
    await dummy.transaction(tx => tx.executeSql(''));
  } catch (e) {
    if (this.state.debugEnabled)
      console.log('error while executing SQL in dummy DB');
  }
}

export async function loadDB() {
  let dbFile = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}SQLite/db.db`);

  if (!dbFile.exists)
    makeDir();

  // Add connection using DB.addConnection
  DB.addConnection({
    type: 'expo',
    driver: SQLite,
    name: 'db.db',
  });
}

export async function makeDir() {
  await FileSystem.downloadAsync(
    Asset.fromModule(require('./assets/db/db.db')).uri,
    `${FileSystem.documentDirectory}SQLite/db.db`
  );
}


export async function getAlbums() {
  // Build your query
  let albums = await Builder()
    .table('albums')
    .where('ArtistId', '>', 200)
    .get();

  console.log(albums);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

### For Bare React Native
```javascript
// doc coming soon...
```

## Documentation

- [Retrieving Results](#retrieving-results)
- [Selects](#selects)
- [Raw Expressions](#raw-expressions)
- [Joins](#joins)
- [Unions](#unions)
- [Where Clauses](#where-clauses)
- [Ordering, Grouping, Limit & Offset](#ordering-grouping-limit--offset)
- [Inserts](#inserts)
- [Updates](#updates)
- [Deletes](#deletes)

### Retrieving Results
**Retrieving All Rows From A Table**

You may use the `table` method begin a query. The table method returns a fluent query builder instance for the given table, allowing you to chain more constraints onto the query and then finally get the results using the `get` method:
```javascript
let albums = await Builder()
    .table('albums')
    .get()
```

**Retrieving A Single Row / Column From A Table**

If you just need to retrieve a single row from the database table, you may use the `first` method.
```javascript
let albums = await Builder()
    .table('albums')
    .where('ArtistId', '>', 200)
    .first()
```

If you don't even need an entire row, you may extract a single value from a record using the value method. This method will return the value of the column directly:
```javascript
let employees = await Builder()
    .table('employees')
    .where('Title', 'Sales Support Agent')
    .value('FirstName')
```

To retrieve a single row by its `id` column value, use the `find` method:
```javascript
let users = await Builder()
    .table('users')
    .find(4)
```

**Retrieving A List Of Column Values**

If you would like to retrieve a Collection containing the values of a single column, you may use the `pluck` method. In this example, we'll retrieve a Collection of role titles:
```javascript
let employees = await Builder()
    .table('employees')
    .where('Title', 'Sales Support Agent')
    .pluck('FirstName', 'LastName')
```

#### Aggregates
The query builder also provides a variety of aggregate methods such as count, `max`, `min`, `avg`, and `sum`. You may call any of these methods after constructing your query:
```javascript
let customers = await Builder()
    .table('customers')
    .count()

let invoices = await Builder()
    .table('invoices')
    .max('total')
```

You may combine these methods with other clauses:
```javascript
let invoices = await Builder()
    .table('invoices')
    .where('BillingState', 'CA')
    .avg('total')
```

**Determining If Records Exist**

Instead of using the `count` method to determine if any records exist that match your query's constraints, you may use the `exists` and `doesntExist` methods:
```javascript
let customersA = await Builder()
    .table('customers')
    .where('PostalCode', '14700')
    .exists()

let customersB = await Builder()
    .table('customers')
    .where('PostalCode', '14700')
    .doesntExist()
```

### Selects
**Specifying A Select Clause**

You may not always want to select all columns from a database table. Using the `select` method, you can specify a custom `select` clause for the query:
```javascript
let customers = await Builder()
  .table('customers')
  .select('FirstName', 'Phone as CustomerPhone')
  .get()
```

The `distinct` method allows you to force the query to return distinct results:
```javascript
let customers = await Builder()
  .table('customers')
  .distinct()
  .get()
```

If you already have a query builder instance and you wish to add a column to its existing select clause, you may use the `addSelect` method:
```javascript
let query = Builder()
  .table('customers')
  .select('FirstName')

let customers = await query
  .addSelect('LastName')
  .get()
```

### Raw Expressions
Sometimes you may need to use a raw expression in a query. To create a raw expression, you may use the `raw` method:
```javascript
let users = await Builder().table('users')
  .select(Builder().raw('count(*) as user_count, status'))
  .where('status', '<>', 1)
  .groupBy('status')
  .get()
```

> Raw statements will be injected into the query as strings, so you should be extremely careful to not create SQL injection vulnerabilities.

##### Raw Methods
Instead of using `raw`, you may also use the following methods to insert a raw expression into various parts of your query.

`selectRaw`

The selectRaw method can be used in place of `addSelect(Builder().raw(...))`. This method accepts an optional array of bindings as its second argument:
```javascript
let orders = await Builder()
  .table('orders')
  .selectRaw('price * ? as price_with_tax', [1.0825])
  .get()
````

`whereRaw / orWhereRaw`

The `whereRaw` and `orWhereRaw` methods can be used to inject a raw where clause into your query. These methods accept an optional array of bindings as their second argument:
```javascript
let orders = await Builder()
  .table('orders')
  .whereRaw('price > IF(state = "TX", ?, 100)', [200])
  .get()
````

`havingRaw / orHavingRaw`

The `havingRaw` and `orHavingRaw` methods may be used to set a raw string as the value of the `having` clause. These methods accept an optional array of bindings as their second argument:
```javascript
let orders = await Builder()
  .table('orders')
  .select('department', Builder().raw('SUM(price) as total_sales'))
  .groupBy('department')
  .havingRaw('SUM(price) > ?', [2500])
  .get()
````

`orderByRaw`

The `orderByRaw` method may be used to set a raw string as the value of the `order by` clause:
```javascript
let orders = await Builder()
  .table('orders')
  .orderByRaw('updated_at - created_at DESC')
  .get()
````

### Joins
**Inner Join Clause**

The query builder may also be used to write join statements. To perform a basic "inner join", you may use the `join` method on a query builder instance. The first argument passed to the `join` method is the name of the table you need to join to, while the remaining arguments specify the column constraints for the join. You can even join to multiple tables in a single query:
```javascript
let users = await Builder()
  .table('users')
  .join('contacts', 'users.id', '=', 'contacts.user_id')
  .join('orders', 'users.id', '=', 'orders.user_id')
  .select('users.*', 'contacts.phone', 'orders.price')
  .get()
```

**Left Join / Right Join Clause**

If you would like to perform a "left join" or "right join" instead of an "inner join", use the `leftJoin` or `rightJoin` methods. These methods have the same signature as the `join` method:
```javascript
let usersA = await Builder()
  .table('users')
  .leftJoin('posts', 'users.id', '=', 'posts.user_id')
  .get()

let usersB = await Builder()
  .table('users')
  .rightJoin('posts', 'users.id', '=', 'posts.user_id')
  .get()
```

**Cross Join Clause**

To perform a "cross join" use the `crossJoin` method with the name of the table you wish to cross join to. Cross joins generate a cartesian product between the first table and the joined table:
```javascript
let users = await Builder()
  .table('sizes')
  .crossJoin('colours')
  .get()
```

**Advanced Join Clauses**

You may also specify more advanced join clauses. To get started, pass a `Closure` as the second argument into the `join` method. The `Closure` will receive a `JoinClause` object which allows you to specify constraints on the `join` clause:
```javascript
await Builder()
  .table('users')
  .join('contacts', join => {
    join
      .on('users.id', '=', 'contacts.user_id')
      .orOn(...)
  })
  .get()
```
If you would like to use a "where" style clause on your joins, you may use the `where` and `orWhere` methods on a join. Instead of comparing two columns, these methods will compare the column against a value:
```javascript
await Builder()
  .table('users')
  .join('contacts', join => {
      join
        .on('users.id', '=', 'contacts.user_id')
        .where('contacts.user_id', '>', 5)
  })
  .get()
```

**Subquery Joins**

You may use the `joinSub`, `leftJoinSub`, and `rightJoinSub` methods to join a query to a subquery. Each of these methods receive three arguments: the subquery, its table alias, and a Closure that defines the related columns:
```javascript
await Builder()
  .table('users')
  .join('contacts', join => {
    join
      .on('users.id', '=', 'contacts.user_id')
      .where('contacts.user_id', '>', 5);
    })
  .get()
```

### Unions
The query builder also provides a quick way to "union" two queries together. For example, you may create an initial query and use the `union` method to union it with a second query:
```javascript
let first = await Builder()
  .table('users')
  .whereNull('first_name')

let users = await Builder()
  .table('users')
  .whereNull('last_name')
  .union(first)
  .get()
```

> The `unionAll` method is also available and has the same method signature as `union`.

### Where Clauses
**Simple Where Clauses**

You may use the `where` method on a query builder instance to add `where` clauses to the query. The most basic call to `where` requires three arguments. The first argument is the name of the column. The second argument is an operator, which can be any of the database's supported operators. Finally, the third argument is the value to evaluate against the column.

For example, here is a query that verifies the value of the "votes" column is equal to 100:
```javascript
let users = await Builder()
  .table('users')
  .where('votes', '=', 100)
  .get()
```
For convenience, if you want to verify that a column is equal to a given value, you may pass the value directly as the second argument to the `where` method:
```javascript
let users = await Builder()
  .table('users')
  .where('votes', 100)
  .get()
```
You may use a variety of other operators when writing a `where` clause:
```javascript
let usersA = await Builder()
  .table('users')
  .where('votes', '>=', 100)
  .get()

let usersB = await Builder()
  .table('users')
  .where('votes', '<>', 100)
  .get()

let usersC = await Builder()
  .table('users')
  .where('name', 'like', 'T%')
  .get()
```
You may also pass an array of conditions to the `where` function:
```javascript
let users = await Builder()
  .table('users')
  .where([
    ['status', '=', '1'],
    ['subscribed', '<>', '1'],
  ])
  .get()
```

**Or Statements**

You may chain where constraints together as well as add or clauses to the query. The `orWhere` method accepts the same arguments as the `where` method:
```javascript
let users = await Builder()
  .table('users')
  .where('votes', '>', 100)
  .orWhere('name', 'John')
  .get()
```

**Additional Where Clauses**

`whereBetween / orWhereBetween`

The `whereBetween` method verifies that a column's value is between two values:
```javascript
let users = await Builder()
  .table('users')
  .whereBetween('votes', [1, 100])
  .get()
```

`whereNotBetween / orWhereNotBetween`

The `whereNotBetween` method verifies that a column's value lies outside of two values:
```javascript
let users = await Builder()
  .table('users')
  .whereNotBetween('votes', [1, 100])
  .get()
```

`whereIn / whereNotIn / orWhereIn / orWhereNotIn`

The `whereIn` method verifies that a given column's value is contained within the given array:
```javascript
let users = await Builder()
  .table('users')
  .whereIn('id', [1, 2, 3])
  .get()
```

The `whereNotIn` method verifies that the given column's value is not contained in the given array:
```javascript
let users = await Builder()
  .table('users')
  .whereNotIn('id', [1, 2, 3])
  .get()
```

`whereNull / whereNotNull / orWhereNull / orWhereNotNull`

The `whereNull` method verifies that the value of the given column is `NULL`:
```javascript
let users = await Builder()
  .table('users')
  .whereNull('updated_at')
  .get()
```

The `whereNotNull` method verifies that the column's value is not `NULL`:
```javascript
let users = await Builder()
  .table('users')
  .whereNotNull('updated_at')
  .get()
```

`whereDate / whereMonth / whereDay / whereYear / whereTime`

The `whereDate` method may be used to compare a column's value against a date:
```javascript
let users = await Builder()
  .table('users')
  .whereDate('created_at', '2016-12-31')
  .get()
```

The `whereMonth` method may be used to compare a column's value against a specific month of a year:
```javascript
let users = await Builder()
  .table('users')
  .whereMonth('created_at', '12')
  .get()
```

The `whereDay` method may be used to compare a column's value against a specific day of a month:
```javascript
let users = await Builder()
  .table('users')
  .whereDay('created_at', '31')
  .get()
```

The `whereYear` method may be used to compare a column's value against a specific year:
```javascript
let users = await Builder()
  .table('users')
  .whereYear('created_at', '2016')
  .get()
```

The `whereTime` method may be used to compare a column's value against a specific time:
```javascript
let users = await Builder()
  .table('users')
  .whereTime('created_at', '=', '11:20:45')
  .get()
```

`whereColumn / orWhereColumn`

The `whereColumn` method may be used to verify that two columns are equal:
```javascript
let users = await Builder()
  .table('users')
  .whereColumn('first_name', 'last_name')
  .get()
```

You may also pass a comparison operator to the method:
```javascript
let users = await Builder()
  .table('users')
  .whereColumn('updated_at', '>', 'created_at')
  .get()
```

The `whereColumn` method can also be passed an array of multiple conditions. These conditions will be joined using the and operator:
```javascript
let users = await Builder()
  .table('users')
  .whereColumn([
    ['first_name', '=', 'last_name'],
    ['updated_at', '>', 'created_at'],
  ])
  .get()
```

#### Parameter Grouping
Sometimes you may need to create more advanced where clauses such as "where exists" clauses or nested parameter groupings. The Laravel query builder can handle these as well. To get started, let's look at an example of grouping constraints within parenthesis:

```javascript
let users = await Builder()
  .table('users')
  .where('name', '=', 'John')
  .where(query => {
    query
      .where('votes', '>', 100)
      .orWhere('title', '=', 'Admin')
  })
  .get()
```

As you can see, passing a `Closure` into the `where` method instructs the query builder to begin a constraint group. The `Closure` will receive a query builder instance which you can use to set the constraints that should be contained within the parenthesis group. The example above will produce the following SQL:

```javascript
select * from users where name = 'John' and (votes > 100 or title = 'Admin')
```

> You should always group `orWhere` calls in order to avoid unexpected behavior when global scopes are applied.

### Ordering, Grouping, Limit & Offset
**orderBy**

The `orderBy` method allows you to sort the result of the query by a given column. The first argument to the `orderBy` method should be the column you wish to sort by, while the second argument controls the direction of the sort and may be either `asc` or `desc`:
```javascript
let users = await Builder() 
  .table('users')
  .orderBy('name', 'desc')
  .get()
```

**latest / oldest**

The `latest` and `oldest` methods allow you to easily order results by date. By default, result will be ordered by the `created_at` column. Or, you may pass the column name that you wish to sort by:
```javascript
let users = await Builder() 
  .table('users')
  .latest()
  .first()
```

**inRandomOrder**

The `inRandomOrder` method may be used to sort the query results randomly. For example, you may use this method to fetch a random user:
```javascript
let users = await Builder() 
  .table('users')
  .inRandomOrder()
  .first()
```

**groupBy / having**

The `groupBy` and `having` methods may be used to group the query results. The having method's signature is similar to that of the where method:
```javascript
let users = await Builder() 
  .table('users')
  .groupBy('account_id')
  .having('account_id', '>', 100)
  .get()
```

You may pass multiple arguments to the `groupBy` method to group by multiple columns:
```javascript
let users = await Builder() 
  .table('users')
  .groupBy('first_name', 'status')
  .having('account_id', '>', 100)
  .get()
```

For more advanced `having` statements, see the `havingRaw` method.

**skip / take**

To limit the number of results returned from the query, or to skip a given number of results in the query, you may use the `skip` and `take` methods:
```javascript
let users = await Builder() 
  .table('users')
  .skip(10)
  .take(5)
  .get()
```

Alternatively, you may use the `limit` and `offset` methods:
```javascript
let users = await Builder() 
  .table('users')
  .offset(10)
  .limit(5)
  .get()
```

### Inserts
The query builder also provides an `insert` method for inserting records into the database table. The `insert` method accepts an array of column names and values:
```javascript
let users = await Builder() 
  .table('artists')
  .insert({
    ArtistId: 500,
    Name: 'Euismod Pellentesque'
  })
```

You may even insert several records into the table with a single call to `insert` by passing an array of arrays. Each array represents a row to be inserted into the table:
```javascript
let users = await Builder() 
  .table('artists')
  .insert([
    {
      ArtistId: 501,
      Name: 'Venenatis Elit'
    },
    {
      ArtistId: 502,
      Name: 'Justo Pellentesque'
    },
  ])
```

The `insertOrIgnore` method will ignore duplicate record errors while inserting records into the database:
```javascript
let users = await Builder() 
  .table('artists')
  .insertOrIgnore([
    {
      ArtistId: 501,
      Name: 'Venenatis Elit'
    },
    {
      ArtistId: 502,
      Name: 'Justo Pellentesque'
    },
  ])
```

**Auto-Incrementing IDs**

If the table has an auto-incrementing id, use the `insertGetId` method to insert a record and then retrieve the ID:
```javascript
let users = await Builder() 
  .table('artists')
  .insertGetId({
    ArtistId: 503,
    Name: 'Egestas Inceptos'
  })
```

### Updates
In addition to inserting records into the database, the query builder can also update existing records using the `update` method. The `update` method, like the `insert` method, accepts an array of column and value pairs containing the columns to be updated. You may constrain the `update` query using `where` clauses:
```javascript
let artists = await Builder() 
  .table('artists')
  .table('artists')
  .where('ArtistId', 1)
  .update({
    Name: 'John Doe'
  })
```

**Update Or Insert**

Sometimes you may want to update an existing record in the database or create it if no matching record exists. In this scenario, the `updateOrInsert` method may be used. The `updateOrInsert` method accepts two arguments: an array of conditions by which to find the record, and an array of column and value pairs containing the columns to be updated.

The `updateOrInsert` method will first attempt to locate a matching database record using the first argument's column and value pairs. If the record exists, it will be updated with the values in the second argument. If the record can not be found, a new record will be inserted with the merged attributes of both arguments:
```javascript
let artists = await Builder() 
  .table('artists')
  .updateOrInsert(
    {
      ArtistId: 506
    },
    {
      Name: 'Polymer'
    }
  )
```

#### Increment & Decrement
The query builder also provides convenient methods for incrementing or decrementing the value of a given column. This is a shortcut, providing a more expressive and terse interface compared to manually writing the `update` statement.

Both of these methods accept at least one argument: the column to modify. A second argument may optionally be passed to control the amount by which the column should be incremented or decremented:
```javascript
let artistsA = await Builder() 
  .table('artists')
  .increment('votes')

let artistsB = await Builder() 
  .table('artists')
  .increment('votes', 5)

let artistsC = await Builder() 
  .table('artists')
  .decrement('votes')

let artistsD = await Builder() 
  .table('artists')
  .decrement('votes', 5)

```

You may also specify additional columns to update during the operation:
```javascript
let artists = await Builder() 
  .table('artists')
  .increment('votes', 1, {name: 'John'})
```

### Deletes
The query builder may also be used to delete records from the table via the `delete` method. You may constrain `delete` statements by adding `where` clauses before calling the `delete` method:
```javascript
await Builder() 
  .table('artists')
  .delete()

await Builder() 
  .table('artists')
  .where('ArtistId', 505)
  .delete()
```

If you wish to truncate the entire table, which will remove all rows and reset the auto-incrementing ID to zero, you may use the `truncate` method:
```javascript
await Builder() 
  .table('artists')
  .truncate()
```

## Contributing

> Crane is platform-agnostic, which means it can be used for a web app, and it can be extended for other drivers like PostgreSQL or MySQL by adding Grammar and Connection.

We appreciate feedback and contribution to this repo! Before you get started, please see the following:

- [This repo's contribution guide](CONTRIBUTING.md)

## Support + Feedback

- Use [Issues](https://github.com/adhyapranata/crane/issues) for code-level support
- Use [Mail](mailto://adhyapranata@wingtrail.com) for usage, questions, specific cases


## Thank You!

- [Laravel](https://laravel.com/docs/6.x/queries) as the primary reference of this library

## License

[MIT](LICENSE)
