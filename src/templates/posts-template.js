import React from 'react';
import Helmet from 'react-helmet';
import Posts from '../components/Posts'
import Sidebar from '../components/Sidebar';
import Pagination from '../components/Pagination';

export default function Pages(props) {
    const { posts, page, pagesSum, prevPath, nextPath } = props.pathContext;
    const { title, subtitle } = props.data.site.siteMetadata;
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
            <Pagination
              page={page}
              pagesSum={pagesSum}
              prevPath={prevPath}
              nextPath={nextPath}
            />
          </div>
        </div>
      </div>
    );
  }

export const pagesQuery = graphql`
  query pagesQuery {
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
        limit: 1000,
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