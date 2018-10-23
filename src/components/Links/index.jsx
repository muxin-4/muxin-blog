import React from 'react'
import PropTypes from 'prop-types'
import './style.scss'
import '../../assets/fonts/fontello-771c82e0/css/fontello.css'
import '../../assets/fonts/fontello-404b804e/css/fontello.css'

class Links extends React.Component {
  render() {
    const author = this.props.data
    const links = {
      twitter: author.twitter,
      github: author.github,
      medium: author.medium,
      email: author.email,
      instagram: author.instagram,
      telegram: author.telegram,
    }

    return (
      <div className="links">
        <ul className="links__list">
          <li className="links__list-item">
            <a href={`mailto:${links.email}`}>
              <i className="icon-mail" />
            </a>
          </li>
          <li className="links__list-item">
            <a
              href={`https://www.github.com/${links.github}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="icon-github" />
            </a>
          </li>
          <li className="links__list-item">
            <a
              href={`https://www.twitter.com/${links.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="icon-twitter" />
            </a>
          </li>
          <li className="links__list-item">
            <a
              href={`https://medium.com/@${links.medium}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="icon-medium" />
            </a>
          </li>
        </ul>
        <ul className="links__list">
          <li className="links__list-item">
            <a
              href={`https://t.me/${links.telegram}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="icon-paper-plane" />
            </a>
          </li>
          <li className="links__list-item">
            <a
              href={`https://instagram.com/${links.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <i className="icon-instagram" />
            </a>
          </li>
        </ul>
      </div>
    )
  }
}

Links.propTypes = {
  data: PropTypes.object.isRequired,
}

export default Links
