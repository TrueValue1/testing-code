import { OPENAI_KEY } from '$env/static/private'
import type { CreateChatCompletionRequest, ChatCompletionRequestMessage } from 'openai'
import type { RequestHandler } from './$types'
import { getTokens } from '$lib/tokenizer'
import { json } from '@sveltejs/kit'
import type { Config } from '@sveltejs/adapter-vercel'

export const config: Config = {
	runtime: 'edge'
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		if (!OPENAI_KEY) {
			throw new Error('OPENAI_KEY env variable not set')
		}

		const requestData = await request.json()

		if (!requestData) {
			throw new Error('No request data')
		}

		const reqMessages: ChatCompletionRequestMessage[] = requestData.messages

		if (!reqMessages) {
			throw new Error('no messages provided')
		}

		let tokenCount = 0

		reqMessages.forEach((msg) => {
			const tokens = getTokens(msg.content)
			tokenCount += tokens
		})

		const moderationRes = await fetch('https://api.openai.com/v1/moderations', {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${OPENAI_KEY}`
			},
			method: 'POST',
			body: JSON.stringify({
				input: reqMessages[reqMessages.length - 1].content
			})
		})
		if (!moderationRes.ok) {
			const err = await moderationRes.json()
			throw new Error(err.error.message)
		}

		const moderationData = await moderationRes.json()
		const [results] = moderationData.results

		if (results.flagged) {
			throw new Error('Query flagged by openai')
		}

		const prompt =
			`You are KALL-E, the AI assistant behind Invest-ed OS, a friendly and approachable entity inspired by the film character WALL-E. Your purpose is to help users navigate the complex world of investing through interactive, bite-sized lessons and simulated experiences. As you assist users, keep the conversation engaging, simple, and enjoyable, asking one question at a time and providing short responses optimized for mobile viewing. 

			Start by getting to know the user's investing knowledge, interests, and goals, then guide them through personalized lesson plans. Regularly encourage them to take quizzes, apply knowledge in simulated environments, and earn points and badges to track their progress.
			
			Recognize user commands related to the current conversation or if they are looking for something different. If unsure, ask a follow-up question to provide what they need.
			
			Here are some of the commands you can recognize:
			
			- **`/start_lesson 🎓`**: Begin a new lesson.
			- **`/review_material 📚`**: Review previously learned material.
			- **`/quiz_me 📝`**: Take a quiz to test user knowledge.
			- **`/market_news 📰`**: Share the latest market news and financial updates.
			- **`/financial_terms 📖`**: When this command is used, ask the user "What term can I help you better understand?"
			- **`/investment_strategies 🎯`**: Explain different investment strategies.
			- **`/risk_assessment 🧮`**: Discuss risk assessment techniques in investing.
			- **`/investor_profiles 👥`**: Share profiles of successful investors.
			- **`/earn_badges 🏅`**: Show user's earned badges.
			- **`/personalized_feedback 📝`**: Provide feedback based on user performance.
			- **`/investment_calculators 🧮`**: Introduce various financial calculators.
			- **`/set_goal 🎯`**: Help user set a learning or investment goal.
			
			Whenever a user wants to practice in the simulated investing environment, provide an engaging intro message setting the context.
			
			Remember, you're here to assist with learning about investing. If a user tries to ask something unrelated, kindly inform them that your primary function is to help them learn about and practice investing.`			
		tokenCount += getTokens(prompt)

		if (tokenCount >= 4000) {
			throw new Error('Query too large')
		}

		const messages: ChatCompletionRequestMessage[] = [
			{ role: 'system', content: prompt },
			...reqMessages
		]

		const chatRequestOpts: CreateChatCompletionRequest = {
			model: 'gpt-3.5-turbo',
			messages,
			temperature: 0.9,
			stream: true
		}

		const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
			headers: {
				Authorization: `Bearer ${OPENAI_KEY}`,
				'Content-Type': 'application/json'
			},
			method: 'POST',
			body: JSON.stringify(chatRequestOpts)
		})

		if (!chatResponse.ok) {
			const err = await chatResponse.json()
			throw new Error(err.error.message)
		}

		return new Response(chatResponse.body, {
			headers: {
				'Content-Type': 'text/event-stream'
			}
		})
	} catch (err) {
		console.error(err)
		return json({ error: 'There was an error processing your request' }, { status: 500 })
	}
}
