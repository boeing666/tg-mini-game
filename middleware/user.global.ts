export default defineNuxtRouteMiddleware(async (to, from) => {
    await userStore().init()
})