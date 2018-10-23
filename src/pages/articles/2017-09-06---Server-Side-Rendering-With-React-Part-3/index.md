---
title: Server Side Rendering With React Part 3
date: "2017-09-06"
layout: post
draft: false
path: "/posts/server-side-rendering-with-react-part-3"
category: "How I React"
tags:
  - "React"
  - "React Router"
  - "Server Side Rendering"
description: "In the previous two posts, I set up the basic configuration for both the render server and the client. I also add a routing system to the app and make it work on both sides. In this post, I'll handle the most challenging part -- adding Redux to the web app."
---

In the previous two posts, I set up the basic configuration for both the render server and the client. I also added a routing system to the app and made it work on both sides. In this post, I'll handle the most challenging part -- adding Redux to the web app.

# Challenges of implementing Redux in server side rendering

There are three main challenges in implementing Redux in server side rendering:

1. Initial data loading. Some components need to be populated with data that's fetched elsewhere before rendering. Since the server doesn't have a life cycle hook like `componentDidMount`, it's tricky to wait for data before sending the rendered app to the client.
2. Handling authentication. When implementing authentication, we have two choices: JWT and cookies. However, JWT needs to be sent explicitly, unfortunately we have no way of doing that in SSR, it's out of option. So we'll have to stick with cookies.
3. State rehydration. Once the Redux gets data on the server, it needs to populate the Redux store and ship it to the client.

I'm assuming that readers of this tutorial are already familiar with Redux, so I'll skip the part of configure redux. You can check out the details in the complete files later. Do note that since we have some initial data loading work to do, we need to create the store before we try to render the content on the server, thus the different configuration between the server and the client.

# Implement initial data loading

To tackle the first challenge, we need to customize the react-router-config library.

```javascript
import React from 'react';
import App from "./App";
import HomePage from './components/HomePage';
import UsersListPage from "./components/UsersListPage";

export default [
    {
        ...App,
        routes: [
            {
                ...HomePage,
                path: '/',
                exact: true
            },
            {
                ...UsersListPage,
                path: './users',
            }
        ]
    }
]
```

Since the route configure is no longer a react component, we need to tweak the renderer module in which the route config is used. The key method is `renderRoutes()` from `react-router-config` library. It turns a routes config into a regular react component.

```javascript
// Other imports
// ...
import {StaticRouter} from 'react-router-dom';
import { renderRoutes } from "react-router-config";
import Routes from '../client/Routes';

export default (req, store) => {
    const content = renderToString(
      <Provider store={store}>
        <StaticRouter location={req.path} context={{}}>
          <div>{renderRoutes(Routes)}</div>
        </StaticRouter>
      </Provider>
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

We then need to know what the components are about to be rendered when a request comes in. This is to determine what initial data are needed in order to render the requested components. The key method here is `matchRoutes()`, which takes the routes config and the incoming request path as arguments and returns the components the request needs.

```javascript
// We'll integrate this method into our workflow later
matchRoutes(Routes, req.path);
```

After getting the components each requests need, we need to load the data the components need. To achieve this, we need to add an additional `loadData()` method to each component. Every time a component is about to be rendered, the `loadData()` function will be called.

```javascript
// Insert this function into the UserListPage component.
function loadData(store) {
    return store.dispatch(fetchUsers())
}
```

Then, we need to call `loadData()` function of every components before rendering.

```javascript
app.get('*', (req, res) => {
    const store = createStore(req);
    // The matchRoutes function returns an array of components
    // Each loadData function returns a promise
    const promises = matchRoutes(Routes, req.path)
        .map(route => route.loadData && route.loadData(store));

    Promise.all(promises).then(
      // By the time the store is used in the renderer function,
      // it will be populated with data
        res.send(renderer(req, store))
    );
})
```

# Pre populate Redux store on the client

We've successfully fetched the data and populated the redux store on the server. The app is rendered correctly on the server. However, after the app is rendered, the populated redux store is thrown away and never shipped to the browser! We need to figure out a way to send the populated redux store to the client and use it as initial state.

The way to do this is injecting the store to the rendered HTML. After the React app boots up on the browser, it extract the initial state from the HTML.

```javascript
// We serialize the scripts to avoid XXS attack.
import serialize from "serialize-javascript";

export default (req, store) => {
    const content = renderToString(
      <Provider store={store}>
        <StaticRouter location={req.path} context={{}}>
          <div>{renderRoutes(Routes)}</div>
        </StaticRouter>
      </Provider>
    );

    return `
    <html>
      <head></head>
      <body>
        <div id="root"><${content}</div>
        <script>
          window.INITIAL_STATE = ${serialize(store.getState())}
        </script>
        <script src="bundle.js"></script>
      </body>
    </html>`;
}
```

Then all we need to do is to fetch the store from the HTML:

```javascript
const store = createStore(
  reducers,
  window.INITIAL_STATE,
  applyMiddleware(thunk);
```

# Handle authentication

We've already handled data pre-fetching and state rehydration. The last piece is authentication.

Here we have a big problem. When the API issues a cookie to the browser, the cookie will only be attached to the requests that go to the same domain and port as the API. That means if the render server tries to get private data on behalf of the browser, it have no way of getting the cookies.

We use proxy to solve the problem. The browser will only communicate to the render server. If the browser tries to get private data (By using "private data" and "private API", I mean data that needs authentication to get, and API that needs authentication. I'll use these two words in the following content.), the request will be forwarded to the authentication API. As long as the browser concerns, the API does not exist, it only communicates with the render server.

## Setup proxy

We use `express-http-proxy` to handle request proxy.

```javascript
import proxy from "express-http-proxy";

// Any incoming requests with suffix '/api'
// will be forwarded to the specified url, which is the API.
app.use('/api', proxy('http://react-ssr-api.herokuapp.com'))
```

During the initial page loading, if the browser requests some private data, the render server needs to pre fetch these data, and then populates the data into Redux store before sending it back. In this case, the action creator needs to send requests directly to the API.

After the React app boots up in the browser, the AJAX requests go directly to the render server. The render server then forwards the requests to the private API via proxy. In this case, the action creator needs to send requests to the render server.

We need the AJAX request action creator to behavior differently between the browser and the server. Remember the app we're building is isomorphic, meaning the code of our app should be the same between server and browser.

To solve this issue, we can configure our AJAX library (we'll use axios in this tutorial), so that it sends requests to different end points depending on where the requests are issued from.

## Customize AJAX logic on the client

First, let's configure the client:

```javascript
// client.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: '/api'
})

// We pass the customized axios instance to redux thunk,
// so that every time we make a request, redux thunk will
// use the customized version.
const store = createStore(
  reducers,
  window.INITIAL_STATE,
  applyMiddleware(thunk.withExtraArgument(axiosInstance)));
```

Then we use the customized axios instance inside our action creator that makes the actual requests.

```javascript
// actions/index.js
export const fetchUsers = () => async (dispatch, getState, api) => {
    const res = await api.get('/users');

    dispatch({
        type: FETCH_USERS,
        payload: res
    });
}
```

We invoke the action creator inside our `ComponentDidMount()` life cycle hook inside our connected component.

```javascript
// pages/UserListPage.js
import React, { Component } from "react";
import { connect } from "react-redux";
import { fetchUsers } from "../actions";

class UsersList extends Component {
    componentDidMount() {
        this.props.fetchUsers()
    }
    //....Other details
}

function mapStateToProps(state) {
    return {users: state.users};
}

// The store is for server side
function loadData(store) {
    return store.dispatch(fetchUsers())
}

export default {
    component: connect(mapStateToProps, {fetchUsers})(UsersList),
    loadData
}
```

## Customize AJAX logic on the server

When requests go from the render server to the API, we need to attach cookies to the requests and send the requests directly to the API end point. (No proxy needed.)

```javascript
// helper/createStore.js
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import axios from "axios";
import reducers from '../reducers';

export default req => {
    const axiosInstance = axios.create({
        baseURL: 'http://react-ssr-api.herokuapp.com',
        headers: {cookies: req.get('cookie'||'')}
    })
    const store = createStore(
        reducers,
        {},
        applyMiddleware(thunk.withExtraArgument(axiosInstance)));
    return store;
}
```

Then, when we call the `loadData()` method in the connected components, this version of AJAX requests will be carried out.

Checkout the complete code [here](https://github.com/leihuang69/ssr-tutorial/tree/part3)