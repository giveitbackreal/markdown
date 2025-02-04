import React from 'react';
import PropTypes from 'prop-types';

import markdown, { reactProcessor, reactTOC, utils } from '../index';
import Fixtures from './Fixtures';
import Header from './Header';
import Router from './Router';

require('./demo.scss');

const { GlossaryContext } = utils;

const terms = [
  {
    term: 'demo',
    definition: 'a thing that breaks on presentation',
  },
];

const Maybe = ({ when, children }) => when && children;

function DemoContent({ ci, children, fixture, name, onChange, opts }) {
  return (
    <React.Fragment>
      <Maybe when={!ci}>
        <div className="rdmd-demo--editor">
          <div className="rdmd-demo--editor-container">
            {children}
            <textarea name="demo-editor" onChange={onChange} value={fixture} />
          </div>
        </div>
      </Maybe>
      <div className="rdmd-demo--display">
        <section id="hub-content">
          <Maybe when={!ci}>
            <h2 className="rdmd-demo--markdown-header">{name}</h2>
          </Maybe>
          <div id="content-container">
            <div className="markdown-body">{markdown(fixture, opts)}</div>
            <section className="content-toc">{reactTOC(reactProcessor().parse(fixture), opts)}</section>
          </div>
        </section>
      </div>
    </React.Fragment>
  );
}

DemoContent.propTypes = {
  children: PropTypes.node.isRequired,
  ci: PropTypes.string,
  fixture: PropTypes.string,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  opts: PropTypes.object,
};

function Demo({ opts }) {
  // eslint-disable-next-line no-restricted-globals
  const ci = new URLSearchParams(location.search).get('ci');

  return (
    <GlossaryContext.Provider value={terms}>
      {!ci && <Header />}
      <div className="rdmd-demo--container">
        <div className="rdmd-demo--content">
          <Router
            render={({ route, getRoute }) => {
              return (
                <Fixtures
                  ci={ci}
                  getRoute={getRoute}
                  render={({ options, ...props }) => <DemoContent {...props} ci={ci} opts={{ ...opts, ...options }} />}
                  selected={route}
                />
              );
            }}
          />
        </div>
      </div>
    </GlossaryContext.Provider>
  );
}

Demo.propTypes = {
  opts: PropTypes.object,
};

export default Demo;
