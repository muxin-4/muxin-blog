import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import 'typeface-roboto';
import '../assets/scss/init.scss';

class Layout extends React.Component {
  render() {
    const { children } = this.props;

    return (
      <div className="layout">
        <Helmet defaultTitle="Lei's Blog" />
        {children()}
      </div>
    );
  }
}

Layout.propTypes = {
  children: PropTypes.any
};

export default Layout;
