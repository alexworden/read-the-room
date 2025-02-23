function buildUrl(protocol: string, host: string, port: string): string {
  const isHttps = protocol === 'https';
  const portNumber = isHttps ? '' : `:${port}`;
  return `${protocol}://${host}${portNumber}`;
}

export const config = {
  apiUrl: buildUrl(
    import.meta.env.RTR_API_PROTOCOL || 'http',
    import.meta.env.RTR_API_HOST || 'localhost',
    import.meta.env.RTR_API_PORT || '3000'
  ),
  webUrl: buildUrl(
    import.meta.env.RTR_WEB_PROTOCOL || 'http',
    import.meta.env.RTR_WEB_HOST || 'localhost',
    import.meta.env.RTR_WEB_PORT || '4200'
  ),
};
