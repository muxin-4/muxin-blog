import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import Posts from '../components/Posts'
import Sidebar from '../components/Sidebar';
import Link from 'gatsby-link'

export default function IndexRoute(props) {
    let { edges: posts } = props.data.allMarkdownRemark;
    const { title, subtitle } = props.data.site.siteMetadata;
    posts = posts.map(post => post.node);
    return (
      <div>
        <Helmet>
          <title>{title}</title>
          <meta name="description" content={subtitle} />
        </Helmet>
        <Sidebar {...props} />
        <div className="content">
          <div className="content__inner">
            <Posts posts={posts}/>
            <div className="content__separator"/>
            <div className="content__paginator">
             <Link className="content__paginator-right" to="/posts/page/2">Older Posts &gt;</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }


IndexRoute.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
        subtitle: PropTypes.string.isRequired
      })
    }),
    allMarkdownRemark: PropTypes.shape({
      edges: PropTypes.array.isRequired
    })
  })
};

export const IndexQuery = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
        subtitle
        copyright
        menu {
          label
          path
        }
        author {
          name
          email
          twitter
          github
          medium
          instagram
          telegram
        }
      }
    }
    allMarkdownRemark(
        limit: 5,
        filter: { frontmatter: { layout: { eq: "post" }, draft: { ne: true } } },
        sort: { order: DESC, fields: [frontmatter___date] }
      ){
      edges {
        node {
          fields {
            slug
            categorySlug
          }
          frontmatter {
            path
            title
            date
            category
            description
          }
        }
      }
    }
  }
`;