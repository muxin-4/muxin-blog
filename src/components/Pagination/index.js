import React from 'react';
import Link from 'gatsby-link';
import PropTypes from 'prop-types';
import './style.scss'

const Pagination = ({ prevPath, nextPath, page, pagesSum }) =>
  <header>
    <nav className="pagination" role="navigation">
      {prevPath ?
        <Link className="pagination__newer" to={prevPath}>
          <span aria-hidden="true">←</span> Newer Posts
        </Link> : <div className="pagination__newer">No more pages</div>}
      <span className="pagination__index">{`Page ${page} of ${pagesSum}`}</span>
      {nextPath ?
        <Link className="pagination__older" to={nextPath}>
          Older Posts <span aria-hidden="true">→</span>
        </Link> : <div className="pagination__older">No more pages</div>}
    </nav>
  </header>;

Pagination.propTypes = {
  prevPath: PropTypes.string,
  nextPath: PropTypes.string,
  page: PropTypes.number,
  pagesSum: PropTypes.number,
};

export default Pagination;
