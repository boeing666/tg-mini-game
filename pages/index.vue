
<script setup lang="ts">

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
    }))
)

function changeDeckSize() {
    selectedDeck.value = deckSize.find(deck => deck.name === selectedDeckName.value) || deckSize[0]
    gameOver()
}

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
            >
                <div 
                    v-for="(card, index) in cardsData" 
                    :key="index" 
                    class="relative cursor-pointer perspective flex-shrink-0" 
                    @click="flipCard(card)" 
                    :class="{ 'animate-shake': card.shake }"
                    :style="{ 
                        aspectRatio: '1 / 1' 
                    }"
                >
                    <div 
                        class="absolute w-full h-full bg-white rounded-4xl shadow-md transition-transform duration-200 ease-linear flex items-center justify-center" 
                        :class="{ 'rotate-y-180': card.flipped }"
                    >
                        <Icon 
                            name="material-symbols:question-mark" 
                            class="text-gray-500 text-4xl" />
                    </div>

                    <div
                        class="absolute w-full h-full bg-white rounded-4xl shadow-md transition-transform duration-200 ease-linear backface-hidden rotate-y-180 flex items-center justify-center" 
                        :class="{ 'rotate-y-0': card.flipped }"
                        @mousedown.prevent
                    >
                        <img 
                            :src="card.img" 
                            class="w-full h-full object-cover" 
                            :style="{ visibility: card.flipped ? 'visible' : 'hidden' }" 
                        /> 
                    </div>
                </div>
            </div>

            <div class="flex flex-col w-full">
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

                <select 
                    v-model="selectedDeckName" 
                    @change="changeDeckSize" 
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
.rotate-y-180 {
    transform: rotateY(180deg);
}
.rotate-y-0 {
    transform: rotateY(0);
}
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
