---
title: Implementing Two Way Data Binding With Vanilla JavaScript
date: "2017-06-21T19:18:37.121Z"
layout: post
draft: false
path: "/posts/implementing-two-way-data-binding-with-vanilla-javascript"
category: "Exploring JavaScript"
tags:
  - "Reactive Programming"
  - "Design Pattern"
description: "When I first learned `Vue.js` and Angular, I was impressed by the elegant and expressive style of two way data binding. I was curious how it was implemented, so I did some research and managed to understand the underlying mechanisms. To my surprise, once I understand it, some other seemingly cryptic programming concepts became less intimidating to me, such as reactive programming."
---

When I first learned `Vue.js` and Angular, I was impressed by the elegant and
expressive style of two way data binding. I was curious how it was implemented, so I did some research and managed to
understand the underlying mechanisms. To my surprise, once I understand it, some other seemingly cryptic programming concepts became less
intimidating to me, such as reactive programming. Curious as I was?
Let's dive in.

## Introducing Observables

The core of two way data binding is observables. You may see
this word in the Observer design pattern and `Rx.js`. When I was learning
`Rx.js`, there're no tutorials telling me the implementation details of
observables. I did find some tutorials claiming to teach you how to "create an observable from
scratch". To my disappointment, what they did was `Rx.Observable.create()`...
You call that "from scratch"? After some Googling and Stack Overflow, I think
I can explain these concepts without causing more frustration.

> An observable is a function that takes a value and returns an observer, which,
> when called with a new value, will trigger the listener you specify later on
> to execute automatically.

Phew... This definition I just came up with would seem non sense to me if I
hadn't done my research. Let's make it humanly readable.

### What is an observer?

The main trick in two way data binding is that when you update a value in the
view, the model needs to be notified. And vice versa. To achieve this, an
observer is created. An observer is an interface, through which we can retrieve
data from a target. And when we put new data into that target, the observer
triggers the listener provided by us, so that any change can be observed and reacted to. Let's illustrate it with code.

```javascript
const observer = v => {
  let _v = 1
  if (arguments.length) _v = v
  return _v
}

console.log(observable()) //1
observable(5)
console.log(observable()) //5
```

When called with a value, this observer will return the value, otherwise it will
just return the default value. Seems useless by now. Let's make it useful by
triggering an action when the value changes.

```javascript
const listeners = []
const observer = v => {
  let _v = 1
  if (arguments.length && v !== _v) {
    _v = v
    listeners.forEach(listener => listener())
  }
  return _v
}
// In addition to return _v, we performed some side effects here.
// Then we specify an interface through which the user can provide listeners.
observer.subscribe = listener => listeners.push(listener)

console.log(observer()) // 1
observer.subscribe(v => console.log(v)) // When value changes, we log it to the console.
observer(5) // logs 5
observer(5) // Nothing changed, no output
```

Let's refactor the code so that we can create an observer easily:

```javascript
const observable = value => {
  const listeners = []
  const notify = newVal => listeners.forEach(listener => listener(newVal))

  function observer(newValue) {
    if (arguments.length && newValue !== value) {
      value = newValue
      notify(newValue)
    }
    return value
  }
  observer.subscribe = function(listener) {
    listeners.push(listener)
  }
  return observer
}

var observer = observable(6)
observer.subscribe(newVal => console.log(newVal))
observer(7) // logs 7
```

Now, look back to the definition again. Does it start to make sense to you? We
just assembled all the essential pieces of creating an observer. Remember that an
observer is returned after we call the observable function!

Let's move forward and apply what we've created to the DOM.

Here's our simple markup:

```html
<body>
    <h1 id="title"></h1>
    <input type="text" id="input">
</body>
```

First, we bind our input field to an observer, so that as we input, some listeners are triggered.

```javascript
const bindInputValue = (input, observer) => {
  let initial = observer()
  input.value = initial
  observer.subscribe(() => (input.value = observer()))

  input.addEventListener('input', () => {
    observer(input.value)
  })
}
```

And then we need to bind the displaying node to the observer:

```javascript
const bindNodeText = (node, observer) => {
  const initial = observer()
  node.textContent = initial
  observer.subscribe(() => (node.textContent = observer()))
}
```

Time to do some magic!

```javascript
const titleNode = document.getElementById('title')
const inputField = document.getElementById('input')

const observer = observable('If you can see me, change me!')

bindInputValue(inputField, observer)
bindNodeText(titleNode, observer)
```

Now, as you type in text, the content will show in the title field instantly. Cool!

As of now, we have successfully implemented two way data binding. Let's spice it up and introduce dependency tracking!

First, we add more input fields and displaying area to our HTML markup:

```html
<body>
    <h1 id="title"></h1>
    <input type="text" id="input">
    <hr/>
    <div>
        <p>Left number: <span id="p1"></span></p>
        <p>Right number: <span id="p2"></span></p>
        <p>Result: <span id="p3"></span></p>
        <input type="text" id="a-text">
        +
        <input type="text" id="b-text">
        =
        <input type="text" id="c-text" readonly>
    </div>
</body>
```

We want to dynamically show the calculation result as we type in the dependent number. So we need to write a helper function that applies the calculation to all dependencies and returns the result observer:

```javascript
function computed(calculation, dependencies) {
  // start with the initial value
  var value = observable(calculation())

  // register a listener for each dependency, that updates the value
  function listener() {
    value(calculation())
  }
  dependencies.forEach(function(dependency) {
    dependency.subscribe(listener)
  })

  // now, wrap the value so that users of computed() can't manually update the value
  function getter() {
    return value()
  }
  getter.subscribe = value.subscribe

  return getter
}
```

Let's put this function to use:

```javascript
const a = observable(8)
const b = observable(2)
const c = computed(
  function() {
    return a() + b()
  },
  [a, b]
)

console.log(c()) // 10
a(10)
console.log(c()) // 12
b(7)
console.log(c()) // 17
```

Now, using the `computed()` function, we can implement what we want.

```javascript
const aText = document.getElementById('a-text')
const bText = document.getElementById('b-text')
const cText = document.getElementById('c-text')
const p1Text = document.getElementById('p1')
const p2Text = document.getElementById('p2')
const p3Text = document.getElementById('p3')

const a = observable(3),
  b = observable(2)
const c = computed(
  function() {
    return a() + b()
  },
  [a, b]
)

bindInputValue(aText, a)
bindInputValue(bText, b)
bindInputValue(cText, c)
bindNodeText(p1Text, a)
bindNodeText(p2Text, b)
bindNodeText(p3Text, c)
```

Now, our mission is completed! Have a rest and pet a cat. Here's a fluffy one for you if you don't have a cat:

![Cat](https://s3-ap-southeast-1.amazonaws.com/lei-gallery/blog/posts/fluffy-cat.jpg)

Go to this [jsfiddle](https://jsfiddle.net/leihuang/bevxvoL9/1/) to see the final code. try modify the code and mess things up. You can implement so much more with what we just covered!
