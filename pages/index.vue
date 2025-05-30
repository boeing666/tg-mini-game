
<script setup lang="ts">
import { usePopup } from 'vue-tg/8.0'
const { $trpc } = useNuxtApp()

const deckSize = [
	{ id: 1, size: 4, name: '4x4' },
	{ id: 2, size: 6, name: '6x6' },
	{ id: 3, size: 8, name: '8x8' },
]

const selectedDeck = ref(deckSize[0])
const selectedDeckName = ref(selectedDeck.value.name)

const cardsData = ref(
	Array.from({ length: 16 }, (_, index) => ({
		id: index,
		img: '',
		shake: false,
		flipped: false,
		show: true,
	}))
)

function changeDeckSize() {
	selectedDeck.value = deckSize.find(deck => deck.name === selectedDeckName.value) || deckSize[0]
	gameOver()
}

const popup = usePopup()
const timeLeft = ref(0)
const flips = ref(0)
const disableDeck = ref(false)
const isPlaying = ref(false)
const matchCards = ref(0)

const cardOne = ref<typeof cardsData.value[0] | null>(null)
const cardTwo = ref<typeof cardsData.value[0] | null>(null)

let timer = 0

function initTimer() {
	if (timeLeft.value <= 0) {
		gameOver()
		return
	}
	timeLeft.value--
}

async function flipCard(card: typeof cardsData.value[0]) {
	if (disableDeck.value || 
		!isPlaying.value ||
		card == cardOne.value || 
		card.flipped) {
		return
	}

	flips.value++
	card.flipped = true
	card.show = true

	if (!cardOne.value) {
		cardOne.value = card
		return
	}

	cardTwo.value = card
	disableDeck.value = true

	await $trpc.user.openCards.query( { 
		index1: cardOne.value.id,
		index2: cardTwo.value.id,
	} ).then(res => {
		if (res) {
			if (res.success) {
				matchCards.value++
				cardOne.value = null
				cardTwo.value = null
				disableDeck.value = false
				if (matchCards.value == cardsData.value.length / 2) {
					popup.showAlert('Поздравляем, вы выиграли!')
					gameOver()
				}
				return
			}

			setTimeout(() => {
				if (cardOne.value) {
					cardOne.value.shake = true
				}
				if (cardTwo.value) {
					cardTwo.value.shake = true
				}
			}, 400)

			setTimeout(() => {
				if (cardOne.value) {
					cardOne.value.flipped = false
					cardOne.value.shake = false
					cardOne.value = null
				}

				if (cardTwo.value) {
					cardTwo.value.shake = false
					cardTwo.value.flipped = false
					cardTwo.value = null
				}
				disableDeck.value = false
			}, 1200)
			
			setTimeout(() => {
				if (cardOne.value) {
					card.show = false
				}

				if (cardTwo.value) {
					card.show = false
				}
			}, 1300)
		}
	})
}

async function startGame() {
	const selectedSize = selectedDeck.value.size
	await $trpc.user.startGame.query( { deckSize: selectedSize} ).then(res => {
		timer = window.setInterval(initTimer, 1000)
		isPlaying.value = true

		cardsData.value.forEach((card, index) => {
			card.img = `/api/img/${res.paths[index]}`
			card.shake = false
			card.flipped = false
		})
	})
}

function gameOver() {
	clearInterval(timer);
	isPlaying.value = false;
	flips.value = 0
	matchCards.value = 0
	cardOne.value = null
	cardTwo.value = null
	disableDeck.value = false

	prepareGame()
}

function prepareGame() {
	const selectedSize = selectedDeck.value.size

	cardsData.value = Array.from({ length: selectedSize * selectedSize }, (_, index) => ({
		id: index,
		img: '',
		shake: false,
		flipped: false,
		show: false,
	}))

	if (cardsData.value.length == 16) {
		timeLeft.value = 60
	} else if (cardsData.value.length == 36) {
		timeLeft.value = 180
	} else if (cardsData.value.length == 64) {
		timeLeft.value = 240
	}
}

prepareGame()

</script>

<template>
	<div class="bg-gray-100 h-screen flex items-center justify-center p-4">
		<div class="bg-gray-300 flex flex-col items-center justify-center p-2 rounded-3xl shadow-md w-full">
			<div 
				class="grid gap-2 mb-3 w-full" 
				:style="{ 
					gridTemplateColumns: `repeat(${Math.sqrt(cardsData.length)}, minmax(0, 1fr))`, 
					gridTemplateRows: `repeat(${Math.sqrt(cardsData.length)}, minmax(0, 1fr))` 
				}"
				@mousedown.prevent
			>
				<div 
					v-for="(card, index) in cardsData" 
					:key="index"
					@click="flipCard(card)"
					class="relative cursor-pointer flex-shrink-0 [perspective:1000px] transition-transform duration-200 hover:[transform:scale(1.02)]"
					:class="{ 'animate-shake': card.shake }"
					:style="{ aspectRatio: '1 / 1' }"
				>
					<div
						class="relative w-full h-full transition-transform duration-500 ease-in-out [transform-style:preserve-3d]"
						:class="{ '[transform:rotateY(180deg)]': card.flipped }"
					>
						<div 
							class="absolute w-full h-full rounded-xl flex items-center justify-center [backface-visibility:hidden]"
							:style="{ backgroundColor: card.img ? `url(${card.img})` : 'white', backgroundSize: 'cover', backgroundPosition: 'center' }"
						>
							<Icon 
								name="material-symbols:question-mark"
								class="text-gray-400 text-3xl"
							/>
						</div>

						<div 
							class="absolute w-full h-full rounded-xl flex items-center justify-center [transform:rotateY(180deg)] [backface-visibility:hidden]"
						>
							<img 
								:src="card.img" 
								class="w-full h-full object-cover rounded-xl"
							/>
						</div>
					</div>
				</div>
			</div>

			<div class="flex flex-col w-full">
				<div class="flex flex-col w-full" @mousedown.prevent>
					<div class="bg-white flex flex-row justify-between items-center p-4 rounded-lg shadow-md mb-2">
						<p>Время: {{ timeLeft }}</p>
						<div class="h-6 w-px bg-gray-300"></div>
						<p>Шагов: {{ flips }}</p>
					</div>

					<button class="px-4 py-2 rounded-lg shadow-md cursor-pointer mb-2 bg-blue-500 text-white" @click="isPlaying ? gameOver() : startGame()"
						>
							{{ isPlaying ? 'Закончить' : 'Играть' }}
					</button>

					<button 
						class="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-md cursor-pointer mb-2" 
						@click="$router.push('/leaderboard')"
					>
						Топ игроков
					</button>
				</div>

				<select 
					v-model="selectedDeckName" 
					@change="changeDeckSize" 
					@click.stop 
					class="bg-white px-2 py-1 rounded-lg w-full mb-4"
				>
					<option 
						v-for="size in deckSize" 
						:key="size.id" 
						:value="size.name"
					>
						{{ size.name }}
					</option>
				</select>
			</div>
		</div>
	</div>
</template>

<style scoped>
.animate-shake {
	animation: shake 0.45s ease-in-out;
}
@keyframes shake {
	0%, 100% {
		transform: translateX(0);
	}
	20% {
		transform: translateX(-13px);
	}
	40% {
		transform: translateX(13px);
	}
	60% {
		transform: translateX(-8px);
	}
	80% {
		transform: translateX(8px);
	}
}
</style>
