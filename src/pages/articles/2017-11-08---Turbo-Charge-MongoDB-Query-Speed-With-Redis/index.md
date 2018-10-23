---
title: Turbo Charge MongoDB Query Speed With Redis
date: "2017-11-08"
layout: post
draft: false
path: "/posts/turbo-charge-mongodb-query-speed-with-redis"
category: "I Know Node"
tags:
  - "Node"
  - "Performance"
description: "I've been working with MongoDB for quite a while. For most of the part, I like it. The syntax is expressive simple, which makes it very friendly for new developers. After working for a while, I gradually realized that some queries are expensive to carry out, and some are unnecessary. So I tried to optimize my queries with various techniques. Here's what I've found."
---

I've been working with MongoDB for quite a while. For most of the part, I like it. The syntax is expressive simple, which makes it very friendly for new developers. After working for a while, I gradually realized that some queries are expensive to carry out, and some are unnecessary. So I tried to optimize my queries with various techniques. Here's what I've found.

# A teaser with indexing

When you make a query to a MongoDB collection, MongoDB will perform a full collection scan. If the collection is big, this will take a lot processing power and time. With indexing, you can tell MongoDB what fields you will need ahead of time. When you perform the query, instead of searching every field of the collection, MongoDB will look for the specific field directly.

Consider this situation: You want to perform a text search against the database, your target content resides in the the `name` and `description` field. With indexing, you can tremendously increase the search speed by avoiding scanning every `name` and `description` field of the collection.

First, you add the index to the mongoose schema:

```javascript
// You specify the type of the field to facilitate search.
someSchema.index({
  name: 'text',
  description: 'text'
});
```

Then in your router controller, you can perform the search:

```javascript
const searchController = async (req, res) => {
  const stores = await Store
  .find({
    $text: {
      $search: req.query.q
    }
  }, {
    score: { $meta: 'textScore' }
  })
  // then sort them
  .sort({
    score: { $meta: 'textScore' }
  })
  // limit to only 5 results
  .limit(5);
  res.json(stores);
};
```

This is how you can avoid expensive queries to the database.

# Onward to Redis

Mongoose indexing is handy, however, there are some limitations. First, adding to many indices can slow down writing records the the data base. Each index you add takes additional processing power. Second, you don't know ahead of time all the indices you need. Don't fret it, here's the good news: Sometimes we don't need to query the database at all, while still are able to deliver the content the users request.

Sounds crazy? Keep reading.

The way of reducing queries is through caching. If a query is made, there's no need to perform it again upon new requests within seconds, since the content won't change. So, the main idea is, when a query is made, we cache the results, when the same query requests come in later, we send back the content from the cache, thus avoiding querying the database again.

The caching tool we're going to use is Redis. Redis is an in-memory database, it operates in the RAM of the server, so it's super fast.

# Redis basics

To work with Redis in node, we need to install the `redis` npm module.

Redis save the cache content under key value pairs. To save a record, you write:

```javascript
hset(hashKey, key, content, 'EX', expireTimeInSeconds)
```

To get a record out, you write:

```javascript
hget(hashKey, key)
```

Then we setup the connection:

```javascript
const redisUrl = 'redis://127.0.0.1:6379'
const client = redis.createClient(redisUrl);

// The methods in Redis is callback based,
// we need to turn them to promises
    client.hget = util.promisify(client.hget);
```

# Where to implement cache

Suppose we cache all queries. This is just for educational purpose, normally we wouldn't do this. Where should we implement the cache logic? Since the mongoose model deals with all queries, it seems like a fit candidate. In order to inject the custom cache functionality, we need to monkey patch the prototype methods of mongoose query objects. Here's how it's done:

```javascript
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.exec = async function() {

    // We get the key for redis from the mongoose query object.
    // We combine the query object with the collection name to
    // make the key both unique and consistent.
  const key = JSON.stringify(
    Object.assign({}, this.getQuery(), {
      collection: this.mongooseCollection.name
    })
  );

  // See if we have a value for 'key' in redis
  // We will customize the hashKey later,
  // for now, it's hard coded.
  const cacheValue = await client.hget("hashKey", key);

  // If we do, return that
  if (cacheValue) {
    const doc = JSON.parse(cacheValue);

    // turn JSON into mongoose model instance
    // Notice that if the cached value is array,
    // we need to turn every item of the array into a mongoose model instance.
    return Array.isArray(doc)
      ? doc.map(d => new this.model(d))
      : new this.model(doc);
  }

  // Otherwise, issue the query and store the result in redis
  const result = await exec.apply(this, arguments);

    // We set the expiration time to 10 seconds.
  client.hset("hashKey", key, JSON.stringify(result), 'EX', 10);

  return result;
};
```

# Make the cache toggleable

Now we have a working cache functionality, but it caches all queries under the same hashKey. Let's fix this.

We will add a new method to the prototype chain of the mongoose model object, so that every model instance can access this method and toggle the cache state. Here's the code:

```javascript
mongoose.Query.prototype.cache = function(options = {}) {
    // By checking against this state flag, we can let the exec function know when to cache.
    this.useCache = true;
    // We add a hashKey, which will be provided by the route controller,
    // When we decide to cache a query, we need to provide a hash key.
  this.hashKey = JSON.stringify(options.key || '');

  return this;
};
```

Then we need to configure the `exec()` method accordingly.

```javascript
mongoose.Query.prototype.exec = async function() {
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }

  // ....
  // The rest is the same, except that we need to
  // put the hash key in the hset and hget methods
  // client.hget(this.hashKey, key);
  // client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10);
};
```

# Trigger the cache

Now, in the route controller, we can call the `cache()` method on the mongoose query object and passed in the hash key.

```javascript
app.get('/api/endpoint', requireLogin, async (req, res) => {
    const results = await someModel.find({ _user: req.user.id }).cache({
      key: req.user.id
    });

    res.send(results);
  });
```

# Force delete the cache

Sometimes you don't want to keep the cache. For example, after the user add a record, we need to show them the new content immediately. To do this we need to flash the cache once the post request is completed.

We'll create a middle ware to handle the delete process. When a route need to auto delete the cache, just apply the middle ware to it.

```javascript
function clearHash(hashKey) {
    client.del(JSON.stringify(hashKey));
  }

module.exports = async (req, res, next) => {
    // By making this middle ware async,
    // we let it run after the route controller runs
  await next();

  clearHash(req.user.id);
};
```

Here's how we use this middle ware:

```javascript
const {requireLogin, cleanCache} = require('./middleware');

app.post('/api/endpoint', requireLogin, cleanCache, async (req, res) => {
    // Business logic...
  });
```