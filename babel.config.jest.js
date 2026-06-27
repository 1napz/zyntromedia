// Babel config used exclusively by Jest (via babel-jest in jest.config.js).
// It is intentionally NOT named "babel.config.js" so that Next.js does not
// auto-detect it and disable its native SWC/Turbopack transform.
module.exports = {
  presets: [['@babel/preset-env', { targets: { node: 'current' } }]],
};
