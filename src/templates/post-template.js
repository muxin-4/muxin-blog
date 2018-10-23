import React from 'react';
import PropTypes from 'prop-types';
import Helmet from 'react-helmet';
import PostTemplateDetails from '../components/PostTemplateDetails';

class PostTemplate extends React.Component {
  render() {
    const { title, subtitle } = this.props.data.site.siteMetadata;
    const post = this.props.data.markdownRemark;

    let description;
    if (post.frontmatter.description !== null) {
      description = post.frontmatter.description;
    } else {
      description = subtitle;
    }

    return (
      <div>
        <Helmet>
          <title>{`${post.frontmatter.title} - ${title}`}</title>
          <meta name="description" content={description} />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:creator" content="@leihuang_dev"/>
          <meta name="twitter:site" content="@leihuang_dev"/>
          <meta name="twitter:title" content={`${post.frontmatter.title} - ${title}`}/>
          <meta name="twitter:description" content={description}/>
          <meta name="twitter:image:src" content={post.frontmatter.featureImg || ""}/>
          <meta name="twitter:image:width" content="280"/>
          <meta name="twitter:image:height" content="150"/>
        </Helmet>
        <PostTemplateDetails {...this.props} />
      </div>
    );
  }
}

PostTemplate.propTypes = {
  data: PropTypes.shape({
    site: PropTypes.shape({
      siteMetadata: PropTypes.shape({
        title: PropTypes.string.isRequired,
        subtitle: PropTypes.string.isRequired
      })
    }),
    markdownRemark: PropTypes.object.isRequired
  })
};

export default PostTemplate;

export const pageQuery = graphql`
  query PostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
        subtitle
        copyright
        author {
          name
          twitter
        }
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      html
      fields {
        tagSlugs
      }
      frontmatter {
        title
        tags
        date
        description
      }
    }
  }
`;
