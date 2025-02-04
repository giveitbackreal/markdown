/* eslint-disable no-param-reassign */
require('./styles/main.scss');

const React = require('react');
const unified = require('unified');

/* Unified Plugins
 */
const sanitize = require('./sanitize.schema');

const generateTOC = require('mdast-util-toc');

const mapNodes = require('unist-util-map');
const { selectAll } = require('unist-util-select');

// remark plugins
const remarkRehype = require('remark-rehype');
const rehypeRaw = require('rehype-raw');
const remarkParse = require('remark-parse');
const remarkStringify = require('remark-stringify');
const remarkBreaks = require('remark-breaks');
const remarkSlug = require('remark-slug');
const remarkFrontmatter = require('remark-frontmatter');
const remarkDisableTokenizers = require('remark-disable-tokenizers');

// rehype plugins
const rehypeSanitize = require('rehype-sanitize');
const rehypeStringify = require('rehype-stringify');
const rehypeReact = require('rehype-react');

/* React Custom Components
 */
const BaseUrlContext = require('./contexts/BaseUrl');

const Variable = require('@readme/variable');

const Components = require('./components');

const { GlossaryItem, Code, Table, Anchor, Heading, Callout, CodeTabs, Image, Embed, HTMLBlock, TableOfContents } =
  Components;

export { Components };

/* Custom Unified Parsers
 */
const customParsers = Object.values(require('./processor/parse')).map(parser => parser.sanitize(sanitize));

/* Custom Unified Compilers
 */
const customCompilers = Object.values(require('./processor/compile'));

/* Custom Unified Plugins
 */
const sectionAnchorId = require('./processor/plugin/section-anchor-id');
const tableFlattening = require('./processor/plugin/table-flattening');
const toPlainText = require('./processor/plugin/plain-text');

// Processor Option Defaults
const { options, parseOptions } = require('./options');

/* Utilities
 */
const registerCustomComponents = require('./lib/registerCustomComponents');

/**
 * Normalize Magic Block Raw Text
 */
export function setup(blocks, opts = {}) {
  // merge default and user options
  opts = parseOptions(opts);

  // normalize magic block linebreaks
  if (opts.normalize && blocks) {
    blocks = blocks.replace(/\[block:/g, '\n\n[block:').replace(/\[\/block\]/g, '[/block]\n');
  }

  return [`${blocks}\n\n `, opts];
}

const { icons: calloutIcons } = require('./processor/parse/flavored/callout');

export const utils = {
  BaseUrlContext,
  GlossaryContext: GlossaryItem.GlossaryContext,
  options,
  VariablesContext: Variable.VariablesContext,
  calloutIcons,
};

/**
 * Core markdown text processor
 */
export function processor(opts = {}) {
  /*
   * This is kinda complicated: "markdown" within ReadMe is
   * often more than just markdown. It can also include HTML,
   * as well as custom syntax constructs such as <<variables>>,
   * and other special features.
   *
   * We use the Unified text processor to parse and transform
   * Markdown to various output formats, such as a React component
   * tree. (See https://github.com/unifiedjs/unified for more.)
   *
   * The order for processing ReadMe-flavored markdown is as follows:
   * - parse markdown
   * - parse custom syntaxes add-ons using custom compilers
   * - convert from a remark mdast (markdown ast) to a rehype hast (hypertext ast)
   * - extract any raw HTML elements
   * - sanitize and remove any disallowed attributes
   * - output the hast to a React vdom with our custom components
   */

  return unified()
    .use(remarkParse, opts.markdownOptions)
    .use(remarkFrontmatter, ['yaml', 'toml'])
    .data('settings', opts.settings)
    .data('compatibilityMode', opts.compatibilityMode)
    .use(!opts.correctnewlines ? remarkBreaks : () => {})
    .use(customParsers)
    .use(remarkSlug)
    .use(remarkDisableTokenizers, opts.disableTokenizers)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeSanitize, sanitize);
}

export function plain(text, opts = {}, components = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  return processor(opts)
    .use(rehypeReact, {
      createElement: React.createElement,
      Fragment: React.Fragment,
      components,
    })
    .processSync(text).contents;
}

/**
 *  return a React VDOM component tree
 */
// eslint-disable-next-line react/prop-types
const PinWrap = ({ children }) => <div className="pin">{children}</div>; // @todo: move this to it's own component
const count = {};

export function reactProcessor(opts = {}, components = {}) {
  return processor(opts)
    .use(sectionAnchorId)
    .use(rehypeReact, {
      createElement: React.createElement,
      Fragment: React.Fragment,
      components: {
        'code-tabs': CodeTabs(sanitize, opts),
        'html-block': HTMLBlock(sanitize, opts),
        'rdme-callout': Callout(sanitize),
        'readme-variable': Variable,
        'readme-glossary-item': GlossaryItem,
        'rdme-embed': Embed(sanitize),
        'rdme-pin': PinWrap,
        table: Table(sanitize),
        a: Anchor(sanitize),
        h1: Heading(1, count, opts),
        h2: Heading(2, count, opts),
        h3: Heading(3, count, opts),
        h4: Heading(4, count, opts),
        h5: Heading(5, count, opts),
        h6: Heading(6, count, opts),
        code: Code(sanitize, opts),
        img: Image(sanitize),
        ...registerCustomComponents(components, opts.customComponentPrefix),
      },
    });
}

export function react(content, opts = {}, components = {}) {
  if (!content) return null;
  else if (typeof content === 'string') [content, opts] = setup(content, opts);
  else [, opts] = setup('', opts);

  const proc = reactProcessor(opts, components);
  if (typeof content === 'string') content = proc.parse(content);

  return proc.stringify(proc.runSync(content));
}

export function reactTOC(tree, opts = {}) {
  if (!tree) return null;
  [, opts] = setup('', opts);

  const proc = processor(opts).use(rehypeReact, {
    createElement: React.createElement,
    components: {
      p: React.Fragment,
      'readme-variable': Variable,
      'readme-glossary-item': GlossaryItem,
    },
  });

  // Normalize Heading Levels
  const minLevel = selectAll('heading', tree).reduce((i, { depth }) => (!i || depth <= i ? depth : i), false); // determine "root" depth
  tree = mapNodes(tree, n => {
    if (n.type === 'heading') n.depth -= minLevel - 1;
    return n;
  });

  const toc = generateTOC(tree, { maxDepth: 2 }).map;
  const ast = toc ? proc.stringify(proc.runSync(toc)) : false;

  return ast ? React.createElement(TableOfContents, {}, ast) : null;
}

/**
 *  transform markdown in to HTML
 */
export function html(text, opts = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  return processor(opts).use(rehypeStringify).processSync(text).contents;
}

/**
 *  convert markdown to an hast object
 */
export function hast(text, opts = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  const rdmd = processor(opts).use(tableFlattening);
  const node = rdmd.parse(text);
  return rdmd.runSync(node);
}

/**
 *  convert markdown to an mdast object
 */
export function mdast(text, opts = {}) {
  if (!text) return null;
  [text, opts] = setup(text, opts);

  return processor(opts).parse(text);
}

/**
 * Converts an AST node to plain text
 */
export function astToPlainText(node, opts = {}) {
  if (!node) return '';
  [, opts] = setup('', opts);

  return processor(opts).use(toPlainText).runSync(node);
}

/**
 *  compile mdast to ReadMe-flavored markdown
 */
export function md(tree, opts = {}) {
  if (!tree) return null;
  [, opts] = setup('', opts);

  return processor(opts).use(remarkStringify, opts.markdownOptions).use(customCompilers).stringify(tree);
}

const ReadMeMarkdown = (text, opts = {}) => react(text, opts);

export default ReadMeMarkdown;
