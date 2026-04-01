'use client';

import { useEffect, ReactNode } from 'react';
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

interface FaroProviderProps {
  children: ReactNode;
}

// Extender la interfaz Window para incluir __FARO__
declare global {
  interface Window {
    __FARO__?: any;
  }
}

// Variable global para rastrear si Faro ya fue inicializado
let faroInitialized = false;

export default function FaroProvider({ children }: FaroProviderProps) {
  useEffect(() => {
    if (typeof window !== 'undefined' && !faroInitialized) {
      try {
        // Verificar si Faro ya está registrado globalmente usando window.__FARO__
        if (window.__FARO__) {
          console.log('Faro ya está inicializado, omitiendo nueva inicialización');
          faroInitialized = true;
          return;
        }

        // Obtener configuración de Faro desde variables de entorno
        const faroUrl = process.env.NEXT_PUBLIC_GRAFANA_FARO_URL;
        const faroAppName = process.env.NEXT_PUBLIC_GRAFANA_FARO_APP_NAME || 'AndromedaCore';

        // Verificar si Faro está configurado
        if (!faroUrl) {
          console.log('Faro no está configurado (NEXT_PUBLIC_GRAFANA_FARO_URL no definido)');
          faroInitialized = true;
          return;
        }

        // Inicializar Faro solo si está configurado
        initializeFaro({
          url: faroUrl,
          app: {
            name: faroAppName,
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
          },
          instrumentations: [
            // Mandatory, omits default instrumentations otherwise.
            ...getWebInstrumentations(),

            // Tracing package to get end-to-end visibility for HTTP requests.
            new TracingInstrumentation(),
          ],
        });

        faroInitialized = true;
        console.log('Faro inicializado exitosamente para:', faroAppName);
      } catch (error) {
        console.error('Error al inicializar Faro:', error);
        // Marcar como inicializado para evitar reintentos
        faroInitialized = true;
      }
    }
  }, []);

  return <>{children}</>;
}
