const _ = require('lodash')
const Promise = require('bluebird')
const path = require('path')
const lost = require('lost')
const pxtorem = require('postcss-pxtorem')

function paginate(array, page_size, page_number) {
  return array
    .slice(0)
    .slice((page_number - 1) * page_size, page_number * page_size)
}

/**
 * Create pages for tags
 */
function createTagPages(createPage, edges) {
  const tagTemplate = path.resolve(`src/templates/tag-template.js`)
  let postsToShow = {}
  edges.forEach(({ node }) => {
    if (node.frontmatter.tags) {
      node.frontmatter.tags.forEach(tag => {
        if (!postsToShow[tag]) {
          postsToShow[tag] = []
        }
        postsToShow[tag].push(node)
      })
    }
  })

  Object.keys(postsToShow).forEach(tagName => {
    const pageSize = 6
    const pagesSum = Math.ceil(postsToShow[tagName].length / pageSize)

    for (let page = 1; page <= pagesSum; page++) {
      createPage({
        path: page === 1 ? `/tag/${tagName}` : `/tag/${tagName}/page/${page}`,
        component: tagTemplate,
        context: {
          posts: paginate(postsToShow[tagName], pageSize, page),
          tag: tagName,
          pagesSum,
          page,
        },
      })
    }
  })
}

/**
 * Create pages for categories
 */
function createCategoryPages(createPage, edges) {
  const categoryTemplate = path.resolve(`src/templates/category-template.js`)
  const postsToShow = {}

  edges.forEach(({ node }) => {
    let category = node.frontmatter.category
    if (category) {
      if (!postsToShow[category]) {
        postsToShow[category] = []
      }
      postsToShow[category].push(node)
    }
  })

  Object.keys(postsToShow).forEach(categoryName => {
    const pageSize = 6
    const pagesSum = Math.ceil(postsToShow[categoryName].length / pageSize)

    for (let page = 1; page <= pagesSum; page++) {
      createPage({
        path:
          page === 1
            ? `/category/${categoryName}`
            : `/category/${categoryName}/page/${page}`,
        component: categoryTemplate,
        context: {
          posts: paginate(postsToShow[categoryName], pageSize, page),
          category: categoryName,
          pagesSum,
          page,
        },
      })
    }
  })
}

/**
 * Create pages for posts
 */
function createPostPages(createPage, edges) {
  const postsTemplate = path.resolve('./src/templates/posts-template.js')

  const pageSize = 5
  const pagesSum = Math.ceil(edges.length / pageSize)

  for (let page = 2; page <= pagesSum; page++) {
    createPage({
      path: `posts/page/${page}`,
      component: postsTemplate,
      context: {
        posts: paginate(edges, pageSize, page).map(({node}) => node),
        page,
        pagesSum,
        prevPath: page - 2 > 0 ? `posts/page/${page - 1}` : '/',
        nextPath: page + 1 <= pagesSum ? `posts/page/${page + 1}` : null,
      },
    })
  }
}

/**
 * create single post
 */
function createSinglePost(createPage, edges) {
  const postTemplate = path.resolve('./src/templates/post-template.js')
  edges.forEach((edge, index) => {
    createPage({
      path: edge.node.fields.slug,
      component: postTemplate,
      context: {
        slug: edge.node.fields.slug,
        prev: index === (edges.length - 1) ? null : edges[index + 1].node,
        next: index === 0 ? null : edges[index - 1].node
      },
    })
  })
}

/**
 *  create generic pages
 */

function createGenericPages(createPage, edges) {
  const genericPageTemplate = path.resolve(
    './src/templates/generic-page-template.js'
  )
  edges.forEach(edge => {
    createPage({
      path: edge.node.fields.slug,
      component: genericPageTemplate,
      context: {
        slug: edge.node.fields.slug,
      },
    })
  })
}

exports.createPages = ({ graphql, boundActionCreators }) => {
  const { createPage } = boundActionCreators

  return new Promise((resolve, reject) => {
    graphql(
      `
        {
          allMarkdownRemark(
            limit: 1000
            filter: { frontmatter: { draft: { ne: true } } }
            sort: { order: DESC, fields: [frontmatter___date] }
          ) {
            edges {
              node {
                fields {
                  slug
                  categorySlug
                }
                frontmatter {
                  path
                  date
                  title
                  tags
                  layout
                  category
                  description
                }
              }
            }
          }
        }
      `
    ).then(result => {
      if (result.errors) {
        console.log(result.errors)
        reject(result.errors)
      }

      /**
       * create pagination
       */
      const edges = result.data.allMarkdownRemark.edges;
      const posts = edges.filter(
        item => item.node.frontmatter.layout === 'post'
      )
      const genericPages = edges.filter(
        item => item.node.frontmatter.layout === 'page'
      )

      createGenericPages(createPage, genericPages)
      createPostPages(createPage, posts)
      createSinglePost(createPage, posts)
      createTagPages(createPage, posts)
      createCategoryPages(createPage, posts)
      resolve()
    })
  })
}

exports.onCreateNode = ({ node, boundActionCreators, getNode }) => {
  const { createNodeField } = boundActionCreators

  if (node.internal.type === 'File') {
    const parsedFilePath = path.parse(node.absolutePath)
    const slug = `/${parsedFilePath.dir.split('---')[1]}/`
    createNodeField({ node, name: 'slug', value: slug })
  } else if (
    node.internal.type === 'MarkdownRemark' &&
    typeof node.slug === 'undefined'
  ) {
    const fileNode = getNode(node.parent)
    let slug = fileNode.fields.slug
    if (typeof node.frontmatter.path !== 'undefined') {
      slug = node.frontmatter.path
    }
    createNodeField({
      node,
      name: 'slug',
      value: slug,
    })

    if (node.frontmatter.tags) {
      const tagSlugs = node.frontmatter.tags.map(
        tag => `/tag/${_.kebabCase(tag)}/`
      )
      createNodeField({ node, name: 'tagSlugs', value: tagSlugs })
    }

    if (typeof node.frontmatter.category !== 'undefined') {
      const categorySlug = `/category/${_.kebabCase(
        node.frontmatter.category
      )}/`
      createNodeField({ node, name: 'categorySlug', value: categorySlug })
    }
  }
}

exports.modifyWebpackConfig = ({ config }) => {
  config.merge({
    postcss: [
      lost(),
      pxtorem({
        rootValue: 16,
        unitPrecision: 5,
        propList: [
          'font',
          'font-size',
          'line-height',
          'letter-spacing',
          'margin',
          'margin-top',
          'margin-left',
          'margin-bottom',
          'margin-right',
          'padding',
          'padding-top',
          'padding-left',
          'padding-bottom',
          'padding-right',
          'border-radius',
          'width',
          'max-width',
        ],
        selectorBlackList: [],
        replace: true,
        mediaQuery: false,
        minPixelValue: 0,
      }),
    ],
  })
}
