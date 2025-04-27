// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  ssr: false,

  app: {
    head: {
      meta: [
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no',
        },
      ],
      script: [{ src: 'https://telegram.org/js/telegram-web-app.js' }],
    },
  },

  devtools: { enabled: false },
  css: ['~/public/css/main.css'],

  fonts: {
    families: [
      { name: 'SF Pro', src: '/fonts/sf-pro/SF-Pro.ttf' },
    ],
  },

  $development: {
    vite: {
      server: {
        allowedHosts: true,
        watch: {
          usePolling: true,
        },
      },
      plugins: [
        tailwindcss(),
      ],
    },
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '.prisma/client/index-browser': '@prisma/client/index-browser',
      },
    }
  },

  build: {
    transpile: ['trpc-nuxt']
  },

  nitro: {
    replace: {
      'import * as process': 'import * as processUnused',
    },
    esbuild: {
      options: {
        target: 'es2022'
      }
    }
  },

  sound: {
    sounds: {
      scan: true
    }
  },

  modules: ['@vueuse/sound/nuxt', '@nuxt/icon', '@nuxt/fonts', '@pinia/nuxt', 'pinia-plugin-persistedstate'],
})