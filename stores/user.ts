import { useViewport } from 'vue-tg/8.0'

export const userStore = defineStore('tma-data', {
  state: () => ({
    inited: false,
  }),

  actions: {
    async init() {
      if (this.inited) {
        return
      }

      this.inited = true

      const webStore = useWebAppStore()
      const router = useRouter()
      
      if (!webStore.initData) {
        await router.replace('/usetelegram')
        return
      }

      if (webStore.isMobile) {
        const viewport = useViewport()
        viewport.expand()
      }

      const { $trpc } = useNuxtApp()

      await $trpc.user.auth.mutate({
        initData: webStore.initData,
        hash: webStore.initDataUnsafe.hash,
      })
    }
  }
})