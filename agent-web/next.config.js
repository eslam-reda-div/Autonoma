/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  webpack: (config) => {
    config.module.rules.push({
      test: /\.txt$/,
      use: "raw-loader",
    });
    return config;
  },
  turbopack: { // Moved from experimental.turbo to top-level
    rules: {
      "*.txt": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
  output: 'export',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default config;