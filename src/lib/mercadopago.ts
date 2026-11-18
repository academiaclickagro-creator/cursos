import { MercadoPagoConfig } from 'mercadopago';

const mpAccessToken = process.env.MP_ACCESS_TOKEN || 'TEST-0000000000000000-000000-00000000000000000000000000000000-000000000';

/**
 * Instancia del cliente SDK oficial de Mercado Pago para Node.js v2+.
 */
export const mpClient = new MercadoPagoConfig({
  accessToken: mpAccessToken,
  options: {
    timeout: 7000,
  },
});
