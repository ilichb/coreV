import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Andromeda Core API',
      version: '1.0.0',
      description: 'API de coordinación e infraestructura Web3 para el sistema Andromeda.',
    },
    servers: [
      {
        url: '/api',
        description: 'Servidor local',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/app/api/**/*.ts'], // Busca comentarios en los archivos de la API
};

export const spec = swaggerJsdoc(options);
