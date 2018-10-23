---
title: Deep Dive Into React Component Patterns -- Compound Components
date: "2017-10-05"
layout: post
draft: false
path: "/posts/deep-dive-into-react-component-patterns-compound-components"
category: "How I React"
tags:
  - "React"
  - "React Patterns"
description: "Sometimes you want your react components to be able to configured from outside without meddling the code inside. This need becomes evident when you write a library and expect users to import your components and use them with maximum freedom. To address the need, you can use Compound Components Pattern."
---

Sometimes you want your react components to be able to configured from outside without meddling the code inside. This need becomes evident when you write a library and expect users to import your components and use them with maximum freedom. To address the need, you can use Compound Components Pattern.

A compound component is a component that consists of sub-components, which, can be configured outside of the main component. That's a mouthful. Let me demonstrate with code.

## Basic compound component

Let's say we have a component, in which a toggle button controls a state. We want two text views to display the state alternatively.

```javascript
// ./components/Toggle.js
import Switch from './Switch.js';

class Toggle extends React.Component {
  state = { on: false };
  toggle = () => this.setState(({on}) => ({on:!on}));
  renderOnText = () => this.state.on && <p>The toggle is on.</p>
  renderOffText = () => !this.state.on && <p>The toggle is off.</p>

  render() {
    return (
      <div>
        {this.renderOnText()}
        <Switch on={on} onClick={this.toggle}>
        {this.renderOffText()}
      </div>
    )
  }
}
```

```javascript
//index.js
import Toggle from './components/Toggle'

function App() {
  return <Toggle />
}
```

The Toggle component works, but what if we want to reuse the toggle functionality many times without the need to display the state? We can't configure this component once we import it. Let's fix it in a compound component approach.

```javascript
// ./components/Toggle.js
import Switch from './Switch.js'

/*** Show the toggle state text,
 * the text is passed down as children.
 * The branching logic is controlled by the Toggle class state.
 */
function ToggleOn({ on, children }) {
  return on ? children : null
}

function ToggleOff({ on, children }) {
  return on ? null : children
}

function ToggleButton({ on, toggle, ...props }) {
  return <Switch on={on} onClick={toggle} {...props} />
}

class Toggle extends React.Component {
  static On = ToggleOn
  static Off = ToggleOff
  static Button = ToggleButton
  static defaultProps = { onToggle: () => {} }
  state = { on: false }
  toggle = () =>
    this.setState(
      ({ on }) => ({ on: !on }),
      () => this.props.onToggle(this.state.on)
    )

  render() {
    /*** this.props.children is passed down by parent
     * component who is using this component.
     * We clone the children to pass props into them.
     */
    const children = React.Children.map(this.props.children, child =>
      React.cloneElement(child, {
        on: this.state.on,
        toggle: this.state.toggle,
      })
    )
    return <div>{children}</div>
  }
}
```

```javascript
//index.js
import Toggle from './components/Toggle'

function App() {
  // Now, the text views and the button can be
  // reordered at will, or even ommitted out.
  return (
    <Toggle onToggle={on => console.log('toggle', on)}>
      <Toggle.On>The button is on</Toggle.On>
      <Toggle.Off>The button is off</Toggle.Off>
      <Toggle.Button />
    </Toggle>
  )
}
```

## Make compound component flexible

Our compound component is complete, but it lack some flexibility. Try to group some elements into a div, the component will break.

```javascript
function App() {
  return (
    <Toggle onToggle={on => console.log('toggle', on)}>
      <div>
        <Toggle.On>The button is on</Toggle.On>
        <Toggle.Off>The button is off</Toggle.Off>
      </div>
      <Toggle.Button />
    </Toggle>
  )
}
```

That's because the children property only works for the direct descendant of an element. When we clone the children, we pass props to the div, and they don't propagate down.

To pass down props no matter how deeply the children components are nested, we can use the context API.

```javascript
// ./components/Toggle.js
import Switch from './Switch.js'
import PropTypes from 'prop-types'

/***
 * Instead of passing down state throgh props, we make
 * use of context.
 */

const TOGGLE_CONTEXT = '__toggle__'
function ToggleOn({ children }, context) {
  const { on } = context[TOGGLE_CONTEXT]
  return on ? children : null
}
ToggleOn.contextTypes = {
  [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
}
function ToggleOff({ children }, context) {
  const { on } = context[TOGGLE_CONTEXT]
  return on ? null : children
}
ToggleOff.contextTypes = {
  [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
}
function ToggleButton(props, context) {
  const { on, toggle } = context[TOGGLE_CONTEXT]
  return <Switch on={on} onClick={toggle} {...props} />
}
ToggleButton.contextTypes = {
  [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
}

class Toggle extends React.Component {
  static On = ToggleOn
  static Off = ToggleOff
  static Button = ToggleButton
  static defaultProps = { onToggle: () => {} }
  static childContextTypes = {
    [TOGGLE_CONTEXT]: PropTypes.object.isRequired,
  }

  state = { on: false }
  toggle = () =>
    this.setState(
      ({ on }) => ({ on: !on }),
      () => this.props.onToggle(this.state.on)
    )
  getChildContext() {
    return {
      [TOGGLE_CONTEXT]: {
        on: this.state.on,
        toggle: this.toggle,
      },
    }
  }
  render() {
    return <div>{this.props.children}</div>
  }
}
```

Now, we can group the sub classes however we want.
