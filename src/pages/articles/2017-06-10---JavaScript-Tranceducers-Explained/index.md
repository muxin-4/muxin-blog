---
title: JavaScript Transducers Explained
date: "2017-06-10T19:11:37.121Z"
layout: post
draft: false
path: "/posts/javascript-transducers-explained/"
category: "Exploring JavaScript"
tags:
  - "Functional Programming"
  - "Data Transformation"
description: "When we transform data collections with array built-ins, such as map and filter, we create intermediate collections that both waste memory and slow down our programme. Luckily, we have transducers to help us out! Transducers are composable and efficient data transformation functions which doesn't create intermediate collections. I guess the last sentence doesn't help in explaining at all. So, let's dive in with examples!"
---
## Why we need tranceducers
When we transform data collections with array built-ins, such as `map` and `filter`, we create intermediate collections that both waste memory and slow down the programme. To illustrate what I mean, consider the code below:

```javascript
// Here is a helper function to generate an array of random numbers
const arrayofRandoms = randomCeil => length =>
    Array.from({length: length}, (v, i) =>
        Math.floor(Math.random() * randomCeil));

// Here we generate two random arrays, notice the second one is humongously big.
const arrOfThousand = arrayofRandoms(100)(1000);
const arrOfMillion = arrayofRandoms(100)(1e6);

// Here are two transformer functions we want to perform on a given array
const isEven = val => val % 2 === 0;
const tripleIt = val => val * 3;

// We first apply a sigle transformation to an array, and then apply both transformations:
const singleMapOperation = arr => arr.map(tripleIt);
const mapAndFilterOperation = arr => arr.map(tripleIt).filter(isEven);

```

What we want to know is how performant these two operations are when applied to collections of significantly different sizes. Let's measure it:

```javascript
// Here is a helper function to meassure the time spent to perform a certain function
const timeIt = (label, fn) => {
    console.time(label);
    fn();
    console.timeEnd(label);
};

timeIt('thousand - map', () => {
    singleMapOperation(arrOfThousand);
}); // Result: 0.122ms

timeIt('thousand - map & filter', () => {
    mapAndFilterOperation(arrOfThousand);
}); // Result: 0.087ms

timeIt('million - map', () => {
    singleMapOperation(arrOfMillion);
}); // Result: 125.892ms

timeIt('million - map & filter', () => {
    mapAndFilterOperation(arrOfMillion);
}); // Result: 165.249ms
```
As we can see from the above code, when the array is relatively small, chaining additional transformation methods makes little difference in performance. But as the array grows in size (the `arrayOfMillon` in our case), the difference starts to show. This is because we iterate the collection twice, once through `map`, and the other through `filter`. To avoid creating intermediate collections, let's rewrite our iteration method in an imperative way:

```javascript
timeIt('million - imperative', () => {
    const result = [];
    arrOfMillion
        .forEach(val => {
            const tripled = tripleIt(val);
            if (isEven(tripled)) result.push(tripled);
        });
}); // Result: 27.805ms
```
This approach has a significant improvement in performance compared to the map & filter one.

However, the imperative code is a nested mess. We want to keep our code in a functional style, while achieve the performance gains of the imperative approach. What we need is to compose the transformation functions and then apply the result to given collections, which would be like this:

```javascript
const transformation = compose(map(fn1), filter(fn2), reduce(fn3));
transformation(array);
```

However, the type signatures of `map`, `filter`, and `reduce` are different. Thus, we can't compose them directly. So we need to find a way to rewrite those array built-ins and compose them to a ... you guess it right, transducer!

## Tranceducer in the first look
Let's first rewrite our array built-ins:
```javascript
const map = (xf, array) => {
    return array.reduce((accumulation, value) => {
        accumulation.push(xf(value));
        return accumulation;
    }, []);
}

const filter = (predicate, array) => {
    return array.reduce((accumulation, value) => {
        if (predicate(value)) accumulation.push(value);
        return accumulation;
    }, []);
};
```

Let's then extract the reducers, so they can be passed in from outside:

```javascript
// xf stands for transform, in case you wonder
const map = xf => reducer => {
  return (accumulation, value) => {
    return reducer(accumulation, xf(value));
  };
};

const filter = predicate => reducer => {
  return (accumulation, value) => {
    if (predicate(value)) return reducer(accumulation, value);
    return accumulation;
  };
};
```

Now, our `map` and `filter` both expects a reducer as an argument (after the first call that provides them with the transformation functions, `xf` and `predicate` in our case) and returns a reducer. If you have experience with functional programming, you will notice instantly that we just created a condition where our functions can compose together! Let's put our new `map` and `filter` into practice and do some data transformation work:

```javascript
// First we create a push reducer
const pushReducer = (accumulation, value) => {
  accumulation.push(value);
  return accumulation;
};

/***
 * Then let's apply some transformation functions to map and filter.
 * Note that after we apply the first argument, the map and filter functions
 * will both return a new function waiting to be called with
 * another argument. This is called partial application.
 */

const isEvenFilter = filter(num => num % 2 === 0);
const isNot2Filter = filter(num => num !== 2);

const doubleMap = map(num => num * 2);

[1,2,3,4].reduce(isNot2Filter(isEvenFilter(doubleMap(pushReducer))), []);
```

Now, our operations on the collection will only iterate once (through `reduce`, obviously). However, we don't really like the nested style. So let's create a helper compose function and make our code look nicer:

```javascript
const compose = (...functions) =>
  functions.reduce((accumulation, fn) =>
    (...args) => accumulation(fn(...args)), x => x);
```

Now we can compose elegantly!

```javascript
[1, 2, 3, 4].reduce(
  compose(isNot2Filter, isEvenFilter, doubleMap)(pushReducer),
  [],
);
```

## Generalize our transducer

In the last code snippet, we just created our first transducer. But it's wrapped in a single use case. Let's extract the transducer out and generalize it:

```javascript
const transduce = (xf, reducer, initial, collection) => {
  const transformedReducer = xf(reducer);
  let accumulation = initial;
  for (const value of collection) {
    accumulation = transformedReducer(accumulation, value);
  }

  return accumulation;
}
```

Now, let's test our final form of transducer and use it to organize our previous code example:

```javascript
transduce(
    compose(isNot2Filter, isEvenFilter, doubleMap),
    pushReducer,
    [],
    [1,2,3,4]
)
```

And voila! We just learnt how to create our own transducer! You can use it in your project right away. Or, you can check out [transduce-js](https://github.com/cognitect-labs/transducers-js) library, which has a more complex and performant implementation of what we just did. However, the idea behind is the same!

Thanks for reading, enjoy coding!


