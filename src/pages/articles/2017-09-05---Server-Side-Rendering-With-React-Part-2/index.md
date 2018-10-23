---
title: Server Side Rendering With React Part 2
date: "2017-09-05"
layout: post
draft: false
path: "/posts/server-side-rendering-with-react-part-2"
category: "How I React"
tags:
  - "React"
  - "React Router"
  - "Server Side Rendering"
description: "In this post I'm going to add routing support to the app I built in the last post. Traditionally, we use BrowserRouter to deal with client side routing. It works by monitoring the address bar in the browser and display content accordingly. However, when the server renders our application, it doesn't have access to the address bar. To resolve this, the react-router-dom library provides a different component called StaticRouter."
---

In this post I'm going to add routing support to the app I built in the last post. Traditionally, we use BrowserRouter to deal with client side routing. It works by monitoring the address bar in the browser and display content accordingly. However, when the server renders our application, it doesn't have access to the address bar. To resolve this, the react-router-dom library provides a different component called StaticRouter.

## Adding the routes file

We create a routes file, which will be used both on the server and on the client routing configuration.

```javascript
// ./src/client/Routes.js

import React from 'react';
import {Route} from 'react-router-dom';
import Home from './components/Home';

/** Currently we only have one component,
 * we'll add more later.
 */

export default () => {
    return (
        <div>
            <Route exact path="/" component={Home} />
        </div>
    );
}
```

## Configure the server and the client

Then we'll use this configure file both on the server (the `./src/client/helpers/renderer.js` file) and on the client (the `./src/client/client.js` file).

```javascript
// ./src/client/client.js

// ...
import {BrowserRouter} from 'react-router-dom';
import Routes from './Routes';
// ...

ReactDOM.hydrate(
    <BrowserRouter>
      <Routes />
    </BrowserRouter>,
    document.querySelector('#root'));
```

```javascript
// ./src/client/helpers/renderer.js

// ...
import {StaticRouter} from 'react-router-dom';
import Routes from '../client/Routes';
// ...

export default req => {
    const content = renderToString(
      <StaticRouter location={req.path} context={{}}>
        <Routes />
      </StaticRouter>
    );

    return `
    <html>
      <head></head>
      <body>
        <div id="root"><${content}</div>
        <script src="bundle.js"></script>
      </body>
    </html>`;
}
```

The client side configuration is pretty straight forward. There're some extra work to do on the server.
In the `renderer.js` file, after we import the StaticRouter component, we use it in the `renderToString()` function. The StaticRouter needs to be provided a context property to work. For now, we just ignore it and pass it an empty object. Just like the BrowserRouter, the StaticRouter also needs to know which route the user is visiting. The server doesn't have access to the browser address bar, but it can get the information from the `req` object sent along with the HTTP request, that's why we pass a req property to the `renderer()` function, so we can tell the StaticRouter which route to render by proving `req.path` to the location property.

## Configure the express routing settings

Now we need to pass the req property where we invoked it.

```javascript
// ./src/index.js

// ...

app.get('*', (req, res) => {
    res.send(renderer(req));
})

// ...
```

Notice we also change the url from '/' to '*', in order to delegate all routing work to React Router.

It's time to add another route to our app to test if the routing system works. For simplicity, we'll just add a dummy component:

```javascript
// ./src/client/Routes.js

// ...
export default () => {
    return (
        <div>
            <Route exact path="/" component={Home} />
            <Route path="/hi" component={() => 'Hi'} />
        </div>
    );
}
```

If you follow every step exactly, the app should work! The final code can be found [here](https://github.com/leihuang69/ssr-tutorial/tree/part2):
