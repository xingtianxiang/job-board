/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本地构建不被 lint/类型小问题卡住;CI/部署可自行收紧
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
