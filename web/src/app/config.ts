function buildUrl(protocol: string, host: string, port?: string): string {
  if (!protocol || !host) {
    throw new Error('Protocol and host are required');
  }
  const portPart = port ? `:${port}` : '';
  return `${protocol}://${host}${portPart}`;
}

export const config = {
  apiUrl: buildUrl(
    import.meta.env.RTR_API_PROTOCOL,
    import.meta.env.RTR_API_HOST,
    import.meta.env.RTR_API_PORT
  ),
  webUrl: buildUrl(
    import.meta.env.RTR_WEB_PROTOCOL,
    import.meta.env.RTR_WEB_HOST,
    import.meta.env.RTR_WEB_PORT
  ),
};
