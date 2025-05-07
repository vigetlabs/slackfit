# SlackFit

SlackFit is a Slack bot for gamified workout check-ins, accountability, and encouragement. Users post daily exercise check-ins in a dedicated channel, earn points for participation, media, and reactions, and compete on weekly and monthly leaderboards.

## Features
- Daily exercise thread reminders in a designated Slack channel
- Users check in by replying to the daily thread
- Points for check-ins, media (photos/videos), and reactions (with a cap)
- Weekly and monthly leaderboards
- `/whiteboard` slash command to view the leaderboard
- Only valid check-ins (not comments or @ mentions) earn points
- Reactions only count on valid check-ins

## Setup

1. **Clone the repository:**
   ```bash
   git clone git@github.com:vigetlabs/slackfit.git
   cd slackfit
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create a `.env` file:**
   Copy `.env.example` or create a new `.env` file with:
   ```env
   SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
   SLACK_APP_TOKEN=xapp-your-slack-app-token
   SLACK_SIGNING_SECRET=your-slack-signing-secret
   EXERCISE_CHANNEL_ID=your-channel-id
   SLACK_APP_ID=A08R3D5MY12
   # PORT=5173
   ```

4. **Run the bot locally:**
   ```bash
   npm run dev
   ```

5. **Expose your local server with ngrok:**
   - Install ngrok if you haven't already:
     ```bash
     npm install -g ngrok
     ```
   - Start ngrok on the port your app is running on (default is 5173):
     ```bash
     ngrok http 5173
     ```
   - Copy the HTTPS forwarding URL provided by ngrok (e.g., `https://abcd1234.ngrok.io`).

6. **Update your Slack App settings:**
   - Go to your app's settings at https://api.slack.com/apps and select your app.
   - **Event Subscriptions:**
     - Enable Events.
     - Set the Request URL to: `https://<your-ngrok-subdomain>.ngrok.io/slack/events`
   - **Interactivity & Shortcuts:**
     - Enable Interactivity.
     - Set the Request URL to: `https://<your-ngrok-subdomain>.ngrok.io/slack/interactivity`
   - **Slash Commands:**
     - For each slash command (e.g., `/whiteboard`), set the Request URL to: `https://<your-ngrok-subdomain>.ngrok.io/slack/commands`
   - Save your changes in the Slack App settings.

7. **Post a daily thread manually (for testing):**
   ```bash
   npm run post-thread
   ```

## Testing
- To run with sample data (Alice, Bob, Carol), set `NODE_ENV=test` or `USE_SAMPLE_DATA=true` before running your test script.
- To reset all data, delete `db.json`.

## Important Environment Variables
- `SLACK_BOT_TOKEN`: Your Slack bot token
- `SLACK_SIGNING_SECRET`: Your Slack app signing secret
- `EXERCISE_CHANNEL_ID`: The channel ID for exercise check-ins
- `PORT`: (Optional) The port the app will run on locally. Defaults to 5173 if not set.

## Project Structure
- `src/` - Main TypeScript source code
- `dist/` - Compiled JavaScript output
- `scripts/` - Utility scripts (e.g., postThread)
- `db.json` - Local database (ignored by git)

## Notes
- Only replies to the daily thread posted by the bot are considered valid check-ins.
- Points are not awarded for @ mention comments or replies.
- Reaction points are capped per user and only count on valid check-ins.
- Leaderboard only shows real data unless running in test mode.

## License
MIT 

## Linting and Formatting

- To check code style and find issues:
  ```bash
  npm run lint
  ```
- To automatically fix formatting issues:
  ```bash
  npm run format
  ```
