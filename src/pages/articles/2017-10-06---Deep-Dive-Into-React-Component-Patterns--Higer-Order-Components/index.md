---
title: Deep Dive Into React Component Patterns -- Higher Order Components
date: "2017-10-06"
layout: post
draft: false
path: "/posts/deep-dive-into-react-component-patterns-higher-order-components"
category: "How I React"
tags:
  - "React"
  - "React Patterns"
description: "The compound component we created in the last post is easily configurable, but it breaks the props chain. In order to add new component to the compound component, the users have to provide a context for it to work. When I work with components imported from elsewhere, I hate to have to look into the code details, I want to be agnostic about them and use the API right away."
---

The compound component we created in the last post is easily configurable, but it breaks the props chain. In order to add new component to the compound component, the users have to provide a context for it to work. When I work with components imported from elsewhere, I hate to have to look into the code details, I want to be agnostic about them and use the API right away. We need higher order components to give our component this quality.

## Higher order components in the first look

Let's say we have a new component.

```javascript
const MyToggle = ({on, toggle}) => (
  <button onClick={toggle}>
    {on ? 'on' : 'off'}
  </button>
)
```

We want to add the `MyToggle` component to the Toggle component like this:

```javascript
function App() {
  return (
    <Toggle
      onToggle={on => console.log('toggle', on)}
    >
      <Toggle.On>The button is on</Toggle.On>
      <Toggle.Off>The button is off</Toggle.Off>
      <Toggle.Button />
      <hr />
      <MyToggle />
    </Toggle>
  )
}
```

It won't work. Remember, there're no props passing to child components in the Toggle component. We use context to communicate props to descendant components. Forcing users to implement context in all new components is a terrible idea. We need a smart way to factor the context implementation away.

A higher order component is a component that returns a component. Why would we need to do that? Let's see what we can do with this design pattern.

Let's write a component that given a component, will return a new **enhanced** component:

```javascript
function withToggle(Component) {
  function Wrapper(props, context) {
    const toggleContext = context[TOGGLE_CONTEXT]
    return (
      <Component {...toggleContext} {...props} />
    )
  }
  Wrapper.contextTypes = {
    [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
  }
  return Wrapper
}
```

Given a component, the component above will return a new component that enhances the passed in component with extra information. In our case, the context. Now, we can easily make a `MyToggle` component that works well inside the `Toggle` component.

```javascript
const MyToggle = withToggle(({on, toggle}) => (
  <button onClick={toggle}>
    {on ? 'on' : 'off'}
  </button>
))
```

We can also apply the higher order component to the `Toggle` component's child components:

```javascript
const ToggleOn = withToggle(({children, on}) => {
  return on ? children : null
})
const ToggleOff = withToggle(({children, on}) => {
  return on ? null : children
})
const ToggleButton = withToggle(
  ({on, toggle, ...props}) => {
    return (
      <Switch
        on={on}
        onClick={toggle}
        {...props}
      />
    )
  },
)
```

## Handle refs with HOC

In React, the `ref` is a port through which you can imperatively modify an instance of a component (after the component is rendered), or a DOM element. The higher order component we created will break the `ref` property since they wrap the child component and only passed in regular props. Let's fix it.

```javascript
function withToggle(Component) {
  function Wrapper(
    {innerRef, ...props},
    context,
  ) {
    const toggleContext = context[TOGGLE_CONTEXT]
    return (
      <Component
        {...props}
        ref={innerRef}
        toggle={toggleContext}
      />
    )
  }
  Wrapper.contextTypes = {
    [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
  }
  return Wrapper
}
```

We pass in an extra prop to the Wrapper function, which sets the returned component's ref property with the new passed in prop.

Now, when we want to use the ref property, we can pass an extra prop to the higher order component:

```javascript
  const MyToggleWrapper = withToggle(MyToggle);
  <MyToggleWrapper
          innerRef={myToggle =>
            (this.myToggle = myToggle)}
        />
```

## Handle unit test of HOC

When we unit test our wrapped component that returned by the higher order component, we don't necessarily want to test the extra props being passed along. Take our `MyToggleWrapper` component for example, we only want to test the original `MyToggle` component, which will not be exported to outside, thus can't be tested. How can we solve this?

Before we return the wrapper component from a higher order component, we can attach the original component to the returned component:

```javascript
function withToggle(Component) {
  function Wrapper(
    {innerRef, ...props},
    context,
  ) {
    const toggleContext = context[TOGGLE_CONTEXT];
    return (
      <Component
        {...props}
        ref={innerRef}
        toggle={toggleContext}
      />
    )
  }
  Wrapper.contextTypes = {
    [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
  }
  Wrapper.WrappedComponent = Component;
  return Wrapper;
}
```

Now, every time we want to test the passed in component, we can test `<WrapperInstance.WrappedComponent />`. If we don't take this approach, we'd have to export the wrapped component to be tested, which is cumbersome and unnecessary.

## Handle static properties with HOC

There're cases that we have a static method in our class component, and then we feed that component to a higher order component, and boom, the static method doesn't work only more.

To be accurate, the static method does work, but it only work if we use the component directly, which is not the case, since we wrapper it in another component. To make the static method of the inner component usable, we will use a library called **Hoist Non React Statics**. As the name suggests, this library hoist all non-react inner statics to the wrapper component. Why non-react statics? Because we may add some react static methods to the wrapper component, and we don't want to overwrite them. The code is simple:

```javascript
import hoistNonReactStatics from 'hoist-non-react-statics';

function withToggle(Component) {
  function Wrapper(
    {innerRef, ...props},
    context,
  ) {
    const toggleContext = context[TOGGLE_CONTEXT]
    return (
      <Component
        {...props}
        ref={innerRef}
        toggle={toggleContext}
      />
    )
  }
  Wrapper.contextTypes = {
    [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
  }
  Wrapper.WrappedComponent = Component
  return hoistNonReactStatics(Wrapper, Component);
}
```