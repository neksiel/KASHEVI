require('dotenv').config();

const config = {
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'kashevi_barbershop',
  },
  business: {
    name: process.env.BUSINESS_NAME || 'Kashevi Barbershop',
    whatsapp: (process.env.BUSINESS_WHATSAPP || '51907550557').replace(/\D/g, ''),
    address: 'Calle Cualquiera #123, Cualquier Lugar',
    scheduleLabel: 'Lunes a Sábados de 9:00 a 22:00',
  },
  admin: {
    secret: process.env.ADMIN_SECRET || 'kashevi_local_dev_secret_2026',
    defaultUser: process.env.ADMIN_DEFAULT_USER || 'admin',
    defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'kashevi2026',
    tokenTtlSeconds: 60 * 60 * 12,
  },
  schedule: {
    openHour: 9,
    closeHour: 22,
    slotStepMin: 30,
    minLeadMin: 15,
    closedWeekdays: [0], // 0 = Domingo
  },
};

module.exports = config;
