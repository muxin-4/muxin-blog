import React from 'react'
import PropTypes from 'prop-types'
import Posts from '../Posts'
import Pagination from '../Pagination/TagsPagination'

export function CategoryTemplateDetails(props) {
  const category = props.pathContext.category
  let { posts, page, pagesSum } = props.pathContext
  return (
    <div className="content">
      <div className="content__inner">
        <div className="page">
          <h1 className="page__title">{category}</h1>
          <div className="page__body">
            <Posts posts={posts} />
            <div className="content__separator" />
            <Pagination
              page={page}
              pagesSum={pagesSum}
              tag={category}
              tagName="category"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

CategoryTemplateDetails.propTypes = {
  data: PropTypes.shape({
    allMarkdownRemark: PropTypes.shape({
      edges: PropTypes.array.isRequired,
    }),
  }),
  pathContext: PropTypes.shape({
    category: PropTypes.string.isRequired,
  }),
}

export default CategoryTemplateDetails
