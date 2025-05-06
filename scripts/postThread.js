"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const bolt_1 = require("@slack/bolt");
const app = new bolt_1.App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET
});
const channel = process.env.EXERCISE_CHANNEL_ID;
async function postThread(text) {
    if (!channel)
        throw new Error('EXERCISE_CHANNEL_ID is not set');
    await app.client.chat.postMessage({ channel, text });
}
(async () => {
    await postThread("This is a test reminder for the daily exercise thread!");
    console.log('Posted test thread message!');
    process.exit(0);
})();
