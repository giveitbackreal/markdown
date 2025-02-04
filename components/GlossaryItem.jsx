const React = require('react');
const PropTypes = require('prop-types');

const GlossaryContext = require('../contexts/GlossaryTerms');

// https://github.com/readmeio/api-explorer/blob/0dedafcf71102feedaa4145040d3f57d79d95752/packages/api-explorer/src/lib/replace-vars.js#L8
function GlossaryItem({ term, terms }) {
  const foundTerm = terms.find(i => term.toLowerCase() === i.term.toLowerCase());

  if (!foundTerm) return <span>{term}</span>;

  return (
    <span className="glossary-tooltip" v={foundTerm.term}>
      <span className="glossary-item highlight">{term}</span>
      <span className="tooltip-content">
        <span className="tooltip-content-body">
          <strong className="term">{foundTerm.term}</strong> - {foundTerm.definition}
        </span>
      </span>
    </span>
  );
}

GlossaryItem.propTypes = {
  term: PropTypes.string.isRequired,
  terms: PropTypes.arrayOf(
    PropTypes.shape({
      definition: PropTypes.string.isRequired,
      term: PropTypes.string.isRequired,
    })
  ).isRequired,
};

// eslint-disable-next-line react/display-name
module.exports = props => (
  <GlossaryContext.Consumer>{terms => terms && <GlossaryItem {...props} terms={terms} />}</GlossaryContext.Consumer>
);

module.exports.GlossaryItem = GlossaryItem;
module.exports.GlossaryContext = GlossaryContext;
