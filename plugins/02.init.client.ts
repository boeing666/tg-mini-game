export default defineNuxtPlugin(async () => {
    await useWebAppStore().init()
})