import { 
  useMiniApp, 
  useViewport,
  useCloudStorage, 
} from 'vue-tg/8.0'

export const useWebAppStore = defineStore('tgWebAppStore', {
  state: () => ({
    initDataUnsafe: {} as { hash?: any },
    initData: '',
    isMobile: false,
  }),

  actions: {
    async init() {
        const miniApp = useMiniApp()
        if (!miniApp.initData) {
          return
        }

        const viewport = useViewport()

        this.isMobile = ['ios', 'android'].includes(miniApp.platform)

        if (this.isMobile) {
            viewport.isFullscreen.value = true
            viewport.isVerticalSwipesEnabled.value = false
        }

        await this.setInitData()
    },

    async setInitData() {
      const cloudStorage = useCloudStorage()
      const miniApp = useMiniApp()

      if (miniApp.initData !== 'user') {
        await cloudStorage.setItem('initData', miniApp.initData)
        await cloudStorage.setItem('initDataUnsafe', JSON.stringify(miniApp.initDataUnsafe))

        this.initData = miniApp.initData
        this.initDataUnsafe = miniApp.initDataUnsafe
      } else {
        this.initDataUnsafe = JSON.parse(await cloudStorage.getItem('initDataUnsafe'))
        this.initData = await cloudStorage.getItem('initData')
      }
    },
  },
})