
<script setup lang="ts">

const { $trpc } = useNuxtApp()

const boardSizes = [4, 6, 8]
const selectedSize = ref(boardSizes[0])
const players = ref(await $trpc.data.getUsers.query({
    deckSize: selectedSize.value,
}))

async function fetchPlayers(size: number) {
    players.value = await $trpc.data.getUsers.query({
        deckSize: size,
    })
}

function filterBySize(size: number) {
    selectedSize.value = size
    fetchPlayers(size)
}

function formatDateTime(date: string): string {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(date).toLocaleString(undefined, options);
}

function copyToClipboard(text: string) {
	navigator.clipboard.writeText(`@${text}`).then(() => {
		console.log('Copied to clipboard:', `@${text}`);
	}).catch(err => {
		console.error('Failed to copy text:', err);
	});
}

</script>

<template>
    <div class="flex flex-col min-h-screen">
        <div class="flex justify-center space-x-4 mb-6">
            <button
                v-for="size in boardSizes"
                :key="size"
                @click="filterBySize(size)"
                :class="[
                    'px-4 py-1 rounded-lg text-white cursor-pointer',
                    selectedSize === size ? 'bg-blue-500' : 'bg-gray-400/50 hover:bg-gray-500/50'
                ]"
            >
                {{ size }}x{{ size }}
            </button>
        </div>

        <div class="overflow-x-auto">
			<table class="w-full text-sm">
				<colgroup>
					<col style="width: 25%;">
					<col style="width: 10%;">
					<col style="width: 10%;">
					<col style="width: 30%;">
					<col style="width: 10%;">
				</colgroup>
				<thead>
					<tr>
						<th class="px-2 py-1 border-b">Имя</th>
						<th class="px-2 py-1 border-b">Время</th>
						<th class="px-2 py-1 border-b">Ходов</th>
						<th class="px-2 py-1 border-b">Дата</th>
						<th class="px-2 py-1 border-b">Попыток</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="(player, index) in players"
						:key="player.id" 
						class="border-b hover:bg-gray-100 cursor-pointer"
						@click="copyToClipboard(player.user.username)"
					>
						<td class="px-2 py-1 max-w-12 overflow-hidden">@{{ player.user.username }}</td>
						<td class="px-2 py-1 text-center">{{ player.time }}</td>
						<td class="px-2 py-1 text-center">{{ player.steps }}</td>
						<td class="px-2 py-1 text-center">{{ formatDateTime(player.date) }}</td>
						<td class="px-2 py-1 text-center">{{ player.trys }}</td>
					</tr>
				</tbody>
			</table>
        </div>
    </div>
</template>