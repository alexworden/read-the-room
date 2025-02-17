export const config = {
  apiUrl: `${import.meta.env.RTR_API_PROTOCOL || 'http'}://${import.meta.env.RTR_API_HOST || 'localhost'}:${import.meta.env.RTR_API_PORT || '3000'}`,
};
