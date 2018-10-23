---
title: Server Side Rendering With React Part 1
date: "2017-09-04"
layout: post
draft: false
path: "/posts/server-side-rendering-with-react-part-1"
category: "How I React"
tags:
  - "React"
  - "Isomorphic JS"
  - "Server Side Rendering"
description: "This is the part 1 of a series of 3 posts on server side rendering with React. In this post, I'm going to build a boilerplate React application that simply delivers a basic feature of server side rendering. The app will render the JSX on the server and then ship the fully rendered HTML down to the browser, after that, the client side JS will be sent along and the React app will boot up on the browser."
---

This is the part 1 of a series of 3 posts on server side rendering with React. In this post, I'm going to build a boilerplate React application that simply delivers a basic feature of server side rendering. The app will render the JSX on the server and then ship the fully rendered HTML down to the browser, after that, the client side JS will be sent along and the React app will boot up on the browser.

## Why Server Side Rendering?

In a traditional React application, when users enter the url and request the app to be loaded, the browser first downloads a skeleton HTML that contains just the root anchor, then the browser just waits the bundled JavaScript file to be sent along. Once the JS is loaded to the browser, the app reloads and renders the content. There apparently is time wasted on waiting.

Another issue with traditional React app is that in the server, the search engine crawler can't make sense of the bundled JavaScript file. So the whole application is not SEO friendly.

Server Side Rendering solves these two problems by reducing the initial loading time and rendering the HTML content on the server, so search engine crawlers can parse the content.

## App Overview

Although I'm going to build a full-featured SSR app in the end of this series, I'll keep things simple and build an app that only shows a text view that can be interacted with. There're a lot of configurations to be done to achieve this simple goal. Let's get started.

## Client Side Code

To give the server something to render, we first create a basic React component.

In the project root folder , we create a `src` folder, then in it we create a `client` folder, in which we then create a `components` folder, and then we create a `Home.js` file in the `components` folder.

```javascript
// src/client/components/Home.js
import React from 'react'

const Home = () => {
  return <div>I'm the home component</div>
}

export default Home
```

## Server Configuration

The application I'm going to build is served by two servers, one for API and data feeding, another for rendering. For simplicity, I'll skip the process of building an API server and focus on the rendering server.

First, let's setup the express server by creating an `index.js` file in the src folder:

```javascript
// index.js
// configurations for the express server.
import express from 'express'

const app = express()

app.listen(3000, () => {
  console.log('Listening on prot 3000')
})
```

To render JSX on the server, we'll make use of a helper function `renderToString()` from the `react-dom` library.

```javascript
import React from 'react'
import { renderToString } from 'react-dom/server'
import Home from './client/components/Home'

app.get('/', (req, res) => {
  const content = renderToString(<Home />)

  res.send(content)
})
```

Note that we're trying to send back JSX code directly to the browser. However, the Node environment doesn't understand JSX at all, we need some extra configuration to make the JSX code legible. That's where webpack comes in.

```javascript
// /webpack.server.js

const path = require('path');
module.exports = {
  // Inform webpack that we're building a bundle
  // for nodeJS, rather than for the browser
  target: 'node',

  // Tell webpack the root file of our
  // server application
  entry: './src/index.js',

  // Tell webpack where to put the output file
  // that is generated
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build'),
  },

  // Tell webpack to run babel on every file it runs through
  module: {
    rules: [
      {
        test: /\.js?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [
            'react',
            'stage-0',
            ['env', { targets: { browsers: ['last 2 versions'] } }],
          ],
        },
      },
    ],
  },
}
```
Then we need to provide a script command to run the webpack configuration. In the `package.json` file, find the scripts field, and add these two lines in it:
```json
"dev:build-server": "webpack --config webpack.server.js --watch",
"dev:server": "nodemon --watch build --exec \"node build/bundle.js\""
// Restart our server upon changes.
```

Now, run the command `npm run dev:build-server` in the terminal. This will generate a bundle file in the build folder, which is what we need to boot up the server. Run `node build/bundle.js` to execute the file, and then navigate the browser to `localhost:3000`, you'll see the sentence in the Home component.

## Client Side Configuration

Now that our app can display static content, let's make it interactive by adding some simple business logic. We'll add a button to the `Home` component, when the button is clicked, it simply logs something to the console.
```javascript
// src/client/components/Home.js
// Inside the returned JSX, add:
<button onClick={()=>console.log('Hi, there!')}>Press me!</button>
```

Save the file and refresh the browser. Click the button and notice that nothing happens! That's because the server only sends a bare bone rendered HTML file to the browser, no JS file attached. To make the JS code work in the browser, we need to compile the JS code on the server and send the bundled file to the browser after the HTML file is downloaded.

This leads us creating two separate JS files for our app, one for the server, another for the client. We could only use one copy of the server side JS both on the server and in the browser. However, the server side code may contain some sensitive information that we don't want to send to our user, such as API key, etc.

So, let's create our client specific JS bundle:
```javascript
// /webpack.client.js

const path = require('path');
module.exports = {

  entry: './src/client/client.js',

  // Tell webpack where to put the output file
  // that is generated
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public')
  },

  // Tell webpack to run babel on every file it runs through
  module: {
    rules: [
      {
        test: /\.js?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [
            'react',
            'stage-0',
            ['env', { targets: { browsers: ['last 2 versions'] } }],
          ],
        },
      },
    ],
  },
}
```
Then as before, we add the command script in the `package.json` file:
`"dev:build-client": "webpack --config webpack.client.js --watch"`

Now we need to inform the express server to treat our newly generated bundle file as public resources:
```javascript
// src/index.js
app.use(express.static('public'));
```

And then we need to acknowledge the rendered HTML file the existence of the `bundle.js` file.
```javascript
// src/index.js
app.get('/', (req, res) => {
    const content = renderToString(<Home />);

    const html = `
    <html>
      <head></head>
      <body>
        <div id="root"><${content}</div>
        <script src="bundle.js"></script>
      </body>
    </html>`;
    res.send(html);
    // We send back an html file that contains the bundle.js file.
})
```

We still need to provide the entry point JS file for our client side code.
```javascript
// Startup entry point for the client side applicatipon

import React from 'react';
import ReactDOM from 'react-dom';
import Home from './components/Home';

// Instead of using 'render', we use hydrate when deal with SSR
ReactDOM.hydrate(<Home />, document.querySelector('#root'));
```

## Refactor and Clean Up
Now our app works as expected, we can refactor our code for easier maintenance and better performance.
1. DRY

We created two webpack files that contain a lot of identical code, which is inelegant. We'll pull out the identical code.

First, put the shared code to a new file:
```javascript
// webpack.base.js

module.exports = {
  // Tell webpack to run babel on every file it runs through
  module: {
    rules: [
      {
        test: /\.js?$/,
        loader: 'babel-loader',
        exclude: /node_modules/,
        options: {
          presets: [
            'react',
            'stage-0',
            ['env', { targets: { browsers: ['last 2 versions'] } }]
          ]
        }
      }
    ]
  }
};
```

Then merge the new file with the server side configuration and the client side configuration separately:

```javascript
// webpack.client.js

const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.js');

const config = {

  entry: './src/client/client.js',

  // Tell webpack where to put the output file
  // that is generated
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'public')
  }
};

module.exports = merge(baseConfig, config);
```

```javascript
// webpack.server.js

const path = require('path');
const merge = require('webpack-merge');
const baseConfig = require('./webpack.base.js');

const config = {
  // Inform webpack that we're building a bundle
  // for nodeJS, rather than for the browser
  target: 'node',

  // Tell webpack the root file of our
  // server application
  entry: './src/index.js',

  // Tell webpack where to put the output file
  // that is generated
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'build')
  }

};

module.exports = merge(baseConfig, config);
```

2. A single command line to boot up all the building process

With the help of a third party utility `npm-run-all`, we can run all our command lines in one line of code.

In the `package.json` file, add this command to the `scripts` field:
`"dev": "npm-run-all --parallel dev:*",`

3. Ignoring files for the server side bundle

Since Node can require modules at runtime, we don't need to import all the dependencies the the final bundle file. To ignore these dependencies, we just need two lines of code. In the `webpack.server.js`, add:
```javascript
// ...
const webpackNodeExternals = require('webpack-node-externals');
//...
// add to the config object:
externals: [webpackNodeExternals()]
```

4. Extract the render functionality

We'll deal with more advanced and complicated business logic in the `renderToString()` process, let's extract it to the outside world.
```javascript
// src/helpers/renderer.js
import React from 'react';
import {renderToString} from 'react-dom/server';
import Home from '../client/components/Home';

export default () => {
    const content = renderToString(<Home />);

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

Then we change the `index.js` file accordingly:
```javascript
// src/index.js
import renderer from './helpers/renderer';
//...
app.get('/', (req, res) => {
    res.send(renderer());
})
```

The final code can be found [here](https://github.com/leihuang69/ssr-tutorial/tree/part1):
