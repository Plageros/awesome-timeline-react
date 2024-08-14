/** @type {import('jest').Config} */
const config = {
  verbose: true,
  transform: {
    "^.+\\.tsx?$": "ts-jest",
    "^.+\\.svg$": "<rootDir>/svg-transform.js",
  },
};

module.exports = config;
