import React from 'react'
import PropTypes from 'prop-types'
import Link from 'gatsby-link'
import moment from 'moment'
import './style.scss'

const Posts = ({ posts }) => (
  <div>
    {posts
      .filter(post => post.frontmatter.title.length > 0)
      .map((post, index) => (
        <div className="post" key={index}>
          <div className="post__meta">
            <time
              className="post__meta-time"
              dateTime={moment(post.frontmatter.date).format('MMMM D, YYYY')}
            >
              {moment(post.frontmatter.date).format('MMMM YYYY')}
            </time>
            <span className="post__meta-divider" />
            <span className="post__meta-category" key={post.frontmatter.category}>
              <Link to={`/category/${post.frontmatter.category}`} className="post__meta-category-link">
                {post.frontmatter.category}
              </Link>
            </span>
          </div>
          <h2 className="post__title">
            <Link className="post__title-link" to={post.frontmatter.path}>
              {post.frontmatter.title}
            </Link>
          </h2>
          <p className="post__description">{post.frontmatter.description}</p>
          <Link className="post__readmore" to={post.frontmatter.path}>
            Read
          </Link>
        </div>
      ))}
  </div>
)

Posts.propTypes = {
  posts: PropTypes.arrayOf(PropTypes.object),
}

export default Posts
