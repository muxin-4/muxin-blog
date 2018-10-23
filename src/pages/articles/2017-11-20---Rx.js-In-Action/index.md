---
title: Rx.js In Action
date: "2017-11-20"
layout: post
draft: false
path: "/posts/rxjs-in-action"
category: "Exploring JavaScript"
tags:
  - "Reactive Programming"
  - "Rx.js"
description: "Reactive programming is a powerful programming paradigm. I was first introduced into this concept when I came across a random tech talk on YouTube. The presenter is from Netflix engineering team. At Netflix, engineers solve async problems with the help of `Rx.js`. I was convinced that this technique will save a lot headaches I've already had in my dealings with async problems"
---

Reactive programming is a powerful programming paradigm. I was first introduced to this concept when I came across a random tech talk on YouTube. The presenter is from Netflix engineering team. At Netflix, engineers solve async problems with the help of `Rx.js`. I was convinced that this technique will save a lot headaches I've have in my dealings with async problems.

I highly recommend you checkout this talk by Jafar Husain.

<iframe width="560" height="315" src="https://www.youtube.com/embed/FAZJsxcykPs?rel=0" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>

In this post, I'll write a simple demo that fetches an array of random users from the random user API and then display them. You can refresh the list, or delete a user so that another random user can show up. This is the demo:

<iframe width="560" height='265' scrolling='no' title='mxGXxV' src='//codepen.io/leihuang/embed/mxGXxV/?height=265&theme-id=0&default-tab=result&embed-version=2' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;'>See the Pen <a href='https://codepen.io/leihuang/pen/mxGXxV/'>mxGXxV</a> by Lei (<a href='https://codepen.io/leihuang'>@leihuang</a>) on <a href='https://codepen.io'>CodePen</a>.
</iframe>

I'll skip the markup and start with JavaScript code.

---

> Rx.js enables you to specify the dynamic behavior of a value just when you declare it.

This is the essence of reactive programming. If you don't understand this statement at this point, that's perfectly OK. We'll revisit this concept after we finish the demo app.

First we get references to the buttons we'll deal with and turn the click events on them into Observables. If you're not familiar with observables, check out my previous [post](https://leihuang.me/posts/implementing-two-way-data-binding-with-vanilla-javascript). In the post, I implemented an observable from ground up. Although the Observable object from Rx.js is more powerful, the key implementation is similar as what I did.

```javascript
const refreshButton = document.querySelector('.refresh')
const closeButton1 = document.querySelector('.close1')
const closeButton2 = document.querySelector('.close2')
const closeButton3 = document.querySelector('.close3')

const refreshClickStream$ = Rx.Observable.fromEvent(refreshButton, 'click')
const closeStream1$ = Rx.Observable.fromEvent(closeButton1, 'click')
const closeStream2$ = Rx.Observable.fromEvent(closeButton2, 'click')
const closeStream3$ = Rx.Observable.fromEvent(closeButton3, 'click')
```

We start the AJAX requests from the beginning, then every time we click the fresh button, we start new request. Let's model these behavior into observables:

```javascript
const startRequest$ = Rx.Observable.of('https://randomuser.me/api/?results=50')
// We map every click event on the refresh button to an url
const refreshStream$ = refreshClickStream$.map(
  env => 'https://randomuser.me/api/?results=50'
)

// This request stream consists of the initial request and following
// requests triggered by the refresh button.
const requestStream$ = startRequest$.merge(refreshStream$)
```

Then we make the request.

```javascript
// We turn each of the elements of an observable into an observable,
// so we need to flatMap it.
const responseStream$ = requestStream$.flatMap(url =>
  Rx.Observable.ajax(url).map(e => e.response)
)
```

If you are familiar with functional programming, you'll notice that an observable is just a monad. I'll talk about this concept in future tutorials.

Keep in mind we're not making the actual AJAX requests here. We are just composing the behavior we want, which will be triggered at the final stage. You may sense some functional programming flavor here. No side effect occurs until data leaves monad.😏

We need a helper function to get a random user from a list users returned from the API:

```javascript
function getRandomUser(userList) {
  const { results } = userList
  return results[Math.floor(Math.random() * results.length)]
}
```

Another helper function to capitalize names:

```javascript
function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
```

Then we need to cast the final form of stream that will be used to generate HTML:

```javascript
function createSuggestionStream(responseStream$, closeClickStream$) {
  return (
    responseStream$
      .map(getRandomUser)
      // This is to ensure that the steam starts from nothing,
      // so we can override the initial markup and show nothing
      .startWith(null)
      // Every time the refresh button is clicked,
      // we clear the data and show nothing.
      .merge(refreshClickStream$.map(ev => null))
      .merge(
        // When a close button is clicked, we get the latest element
        // from the response stream and then get a random user from it.
        closeClickStream$.withLatestFrom(responseStream$, (ev, users) =>
          getRandomUser(users)
        )
      )
  )
}

// Call the function with different close streams
const suggestion1Stream$ = createSuggestionStream(
  responseStream$,
  closeStream1$
)
const suggestion2Stream$ = createSuggestionStream(
  responseStream$,
  closeStream2$
)
const suggestion3Stream$ = createSuggestionStream(
  responseStream$,
  closeStream3$
)
```

We create a function to generate the final HTML:

```javascript
function generateSuggestion(ref, user) {
  const userEl = document.querySelector(ref)
  const imgEl = userEl.querySelector('img')
  if (user === null) {
    userEl.style.visibility = 'hidden'
  } else {
    userEl.style.visibility = 'visible'
    const usernameEl = userEl.querySelector('.username')
    usernameEl.textContent = `${capitalize(user.name.title)}. ${capitalize(
      user.name.last
    )}`
    imgEl.src = user.picture.large
  }
}
```

Finally, we consume the final streams with the `generateSuggestion()` function!

```javascript
suggestion1Stream$.subscribe(user => generateSuggestion('.suggestion1', user))
suggestion2Stream$.subscribe(user => generateSuggestion('.suggestion2', user))
suggestion3Stream$.subscribe(user => generateSuggestion('.suggestion3', user))
```

It's not until we subscribe to the final observables that the actual network requests and DOM manipulations take place. Our streams are just idle and don't care to cause any side effects until we poke it with `subscribe()`.

Our app should work by now, but there're still some corner cases to be resolved.

First, our 3 suggestion streams make 3 separate requests. If you click the refresh button, in the debugger tool, you will find the browser makes 3 identical requests. That's not efficient.

This happens because in the final phase, we subscribed to 3 separate streams. We can fix this by simply share the response stream. We can add `publishReplay().refCount()` to the stream.

Second, there's a chance that we get the same result between 3 suggestions. There's no guarantee that the `getRandomUser()` will return different result when we call it in different places .

We can fix it by modifying the `getRandomUser()`function:

```javascript
const getRandomUser = (function() {
  let _userArray = []
  return function getUser(userList) {
    const { results } = userList
    const user = results[Math.floor(Math.random() * results.length)]

    if (_userArray.includes(user)) {
      if (_userArray.length >= results.length) {
        _userArray = []
        getAnotherRequest$.next('https://randomuser.me/api/?results=50')
      }
      return getUser(userList)
    }
    _userArray.push(user)
    return user
  }
})()
```

When the length of `_userArray` is equal of or greater than the length of the result, the recursion will run indefinitely. We need to reset the `_userArray` and make a new AJAX request. To modify an observable after it's created, we need to use Rx subject.

```javascript
const getAnotherRequest$ = new Rx.Subject()

const requestStream$ = startRequest$
  .merge(refreshStream$)
  .merge(getAnotherRequest$)
```

We use closure and IIFE function to capture the `_userArray` variable, so the inner function can remember the value of `_userArray` between each call. You may be tempted to use a global variable. Don't do that.

## Final notes

Contemplate the quote at the beginning for a while, see if you can understand what it means by now.

The beauty of the code we've written is that we've been composing a dynamic behavior along the way. It's only when we complete composing that the behavior gets triggered and side effects happen. The dynamic behavior in our case is the 3 suggestion streams. They are created from the response stream, which, specifies the behavior we want at the time of declaration.
