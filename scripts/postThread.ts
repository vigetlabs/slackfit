import dotenv from 'dotenv';
dotenv.config();
import { App } from '@slack/bolt';
import { getDailyThreadMessage } from '../src/messages';

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

const channel: string | undefined = process.env.EXERCISE_CHANNEL_ID;

async function postThread(text: string): Promise<void> {
  if (!channel) throw new Error('EXERCISE_CHANNEL_ID is not set');
  await app.client.chat.postMessage({ channel, text });
}

(async () => {
  await postThread(getDailyThreadMessage());
  console.log('Posted daily thread message!');
  process.exit(0);
})(); 
