import React from 'react'
import Link from 'gatsby-link'
import PropTypes from 'prop-types'
import './style.scss'

const TagsPagination = ({ tagName, tag, page, pagesSum }) => (
  <header>
    <nav className="pagination" role="navigation">
      {page == 2 && (
        <Link className="pagination__newer" to={`/${tagName}/${tag}`}>
          <span aria-hidden="true">←</span> Newer Posts
        </Link>
      )}
      {page > 2 && (
        <Link className="pagination__newer" to={`/${tagName}/${tag}/page/${page - 1}`}>
          <span aria-hidden="true">←</span> Newer Posts
        </Link>
      )}
      <span className="pagination__index">{`Page ${page} of ${pagesSum}`}</span>
      {page < pagesSum && (
        <Link
          className="pagination__older"
          to={`/${tagName}/${tag}/page/${page + 1}/`}
        >
          Older Posts <span aria-hidden="true">→</span>
        </Link>
      )}
    </nav>
  </header>
)

TagsPagination.propTypes = {
  tag: PropTypes.string,
  tagName: PropTypes.string,
  page: PropTypes.number,
  pagesSum: PropTypes.number,
}

export default TagsPagination
