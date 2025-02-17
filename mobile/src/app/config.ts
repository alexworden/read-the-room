export const config = {
  apiUrl: `${process.env.RTR_API_PROTOCOL || 'http'}://${process.env.RTR_API_HOST || 'localhost'}:${process.env.RTR_API_PORT || '3000'}`,
};
