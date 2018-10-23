---
title: Understanding Nodejs Event Loop
date: "2017-11-03"
layout: post
draft: false
path: "/posts/understanding-nodejs-event-loop"
category: "I Know Node"
tags:
  - "Node"
  - "Full Stack"
description: "It took me a while to understand how Node achieves non-blocking IO within one single thread. The misconception about Node being single threaded is what causes my confusion. In this post, I'll demonstrate that Node is not completely single threaded, and show you the general implementation of event loop."
---

It took me a while to understand how Node achieves non-blocking IO within one single thread. The misconception about Node being single threaded is what causes my confusion. In this post, I'll demonstrate that Node is not completely single threaded, and show you the general implementation of event loop.

## A quick glimpse of non-blocking I/O

Consider this piece of code:

```javascript
const crypto = require('crypto');

const start = Date.now();

crypto.pbkdf2('secret', 'salt', 100000, 512, 'sha512', () => {
  console.log('1:', Date.now() - start);
}); //1: 1015

crypto.pbkdf2('secret', 'salt', 100000, 512, 'sha512', () => {
  console.log('2:', Date.now() - start);
}); //2: 1021

crypto.pbkdf2('secret', 'salt', 100000, 512, 'sha512', () => {
  console.log('3:', Date.now() - start);
}); //3: 1017

```

When this code gets executed, all the function calls enter into the event loop. After running the code, we find that 3 function calls take almost the same amount of time. Remember that the event loop is in one single thread? How in the world that Node manages to run 3 operations in parallel within one single thread?

## Node is built upon C/C++

The behavior we observed above is because Node implements a C module called `libuv`. Whenever a long running operation takes place in the event loop, `libuv` will come to help and put that task into another thread. When the operation finishes, the event loop will trigger the callback to handle the result.

Now, increase the `crypto.pbkdf2()` function call to 5 times, look what happens.

You will find that the first 4 calls take almost the same amount of time, while the last takes double length of time. Here we encounter an interesting part of Node. By default, the `libuv` library initiates 4 threads in something called "thread pool". The 4 threads run in parallel, that's why the 4 operations take the same amount of time. Because the thread pool can only take 4 operations in a time, the fifth operation just waits for previous operations to finish. That's why the fifth operation takes longer.

Now, let's change the operations. This time we will make http calls in parallel and see what happens.

```javascript
const https = require('https');

const start = Date.now();

function makeRequest() {
  https
    .request('https://www.baidu.com', res => {
      res.on('data', () => {});
      res.on('end', () => {
        console.log(Date.now() - start);
      });
    })
    .end();
}

makeRequest(); //67
makeRequest(); //72
makeRequest(); //72
makeRequest(); //73
makeRequest(); //74
```

You'll find that these 5 calls take almost the same amount of time. We can reasonably infer that the https call happens neither in the single threaded event loop nor in the thread pool. So, what happened?

It turns out that some low level OS tasks like http request are delegated to the operating system by `libuv`. These tasks get executed in parallel outside of event loop and the thread pool.

The event loop also handles timer events, i.e. setTimeout, setInterval, setImmediate. When a timer event is registered, the event loop will wait specified amount of time and trigger the callback.

In summary, the event loop keeps track of these three kinds of event:

1. Timer events, i.e. setTimeout, setInterval and setImmediate.
2. OS tasks, such as server listening and http request.
3. Long running operations, such as fs operations and other Node API.

Here is a diagram I drew to illustrate the big picture:
![Event Loop Diagram](https://s3-ap-southeast-1.amazonaws.com/lei-gallery/blog/posts/node-event-loop.png)