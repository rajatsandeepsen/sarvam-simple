import { Hono } from 'hono';
import { checkSarvamWebHook } from './tools';

const webhook = new Hono()

webhook.use(checkSarvamWebHook())

webhook.post('/webhook', async (c) => {
	const body = await c.req.json()

	console.log({ body })
})

export { webhook };
