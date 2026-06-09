// Force IPv4-first DNS resolution. On some Windows/Node setups the default
// (IPv6-first, "verbatim") order hangs when connecting to Supabase, causing
// server-side getUser() to time out and falsely redirect authed users to /auth.
try { require('dns').setDefaultResultOrder('ipv4first') } catch {}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

module.exports = nextConfig
