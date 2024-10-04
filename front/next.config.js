/** @type {import('next').NextConfig} */

const fs = require('fs');
module.exports = {
  reactStrictMode: false,
  webpack: (config) => {
    config.resolve.fallback = {
      fs: false, net: false, tls: false,
      ...config.resolve.fallback,
      bufferutil: false,
      'utf-8-validate': false,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@peculiar/asn1-rsa': false, // Prevent bundling this module
    };
    return config;
  },
}