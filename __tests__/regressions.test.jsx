const { mdast } = require('..');

// @todo: update remark
test.skip('unspread lists dont render paragraphs', () => {
  expect(mdast('- list item')).toMatchInlineSnapshot(`
Object {
  "children": Array [
    Object {
      "children": Array [
        Object {
          "checked": null,
          "children": Array [
            Object {
              "type": "text",
              "value": "list item",
            },
          ],
          "spread": false,
          "type": "listItem",
        },
      ],
      "ordered": false,
      "spread": false,
      "start": null,
      "type": "list",
    },
  ],
  "type": "root",
}
`);
});
