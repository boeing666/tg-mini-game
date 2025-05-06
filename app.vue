<script lang="ts" setup>
import { useViewport, useTheme, useBackButton } from 'vue-tg/8.0'

const router = useRouter()
const theme = useTheme()
const viewport = useViewport()

const backButton = useBackButton()
backButton.onClick(() => {
  router.back()
})

watch(() => router.currentRoute.value, (newRoute, oldRoute) => {
  backButton.isVisible.value = router.options.history.state.back !== null
});

theme.backgroundColor.value = '#f3f2f8'
theme.headerColor.value = '#f3f2f8'

const marginTopCalculate = computed(() => {
  return `${viewport.contentSafeAreaInset.value.top * 2}px`
})

window.addEventListener('keydown', (e) => {
	if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
		e.preventDefault();
	}
	if (e.key === 'F12') {
		e.preventDefault();
	}
});

window.addEventListener('contextmenu', (e) => {
	e.preventDefault();
});

</script>

<template>
  <div :style="{ paddingTop: marginTopCalculate }" >
    <NuxtPage />
  </div>
</template>

<style scoped>
* {
  font-family: "SF Pro";
}
</style>

