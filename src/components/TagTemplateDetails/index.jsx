import React from 'react'
import PropTypes from 'prop-types'
import Posts from '../Posts'
import Pagination from '../Pagination/TagsPagination'

export function TagTemplateDetails(props) {
  const tagTitle = props.pathContext.tag
  let { posts, page, pagesSum } = props.pathContext
  return (
    <div className="content">
      <div className="content__inner">
        <div className="page">
          <h1 className="page__title">
            All Posts tagged as &quot;{tagTitle}&quot;
          </h1>
          <div className="page__body">
            <Posts posts={posts} />
            <div className="content__separator" />
            <Pagination
              page={page}
              pagesSum={pagesSum}
              tag={tagTitle}
              tagName="tag"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

TagTemplateDetails.propTypes = {
  data: PropTypes.shape({
    allMarkdownRemark: PropTypes.shape({
      edges: PropTypes.array.isRequired,
    }),
  }),
  pathContext: PropTypes.shape({
    tag: PropTypes.string.isRequired,
  }),
}

export default TagTemplateDetails
