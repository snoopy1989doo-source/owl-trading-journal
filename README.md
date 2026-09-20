# OWL Trader Journal · V4.1

OWL Trader is a mobile-first trading journal for recording a position as soon as it is opened, then updating its stop loss and partial exits while it is active.

## What it does

- Records an open trade from the main screen with Entry, Initial SL, optional Take Profit, lot size, account, timeframe, Thai-time Session, and an optional Entry screenshot.
- Shows a live planned R:R preview. BUY/SELL direction and SL placement are validated before saving.
- Manages an open trade with Break Even, Trailing SL, manual current-price updates, partial exits, optional Exit screenshots, and a typed SL-movement timeline.
- Prevents SL moves that increase risk. SL movement history is stored separately from the Initial SL and synchronized per trade through Firebase transactions.
- Estimates realized P&L from price movement, lot size, and a user-provided USD-per-price-unit multiplier. It does not guess broker contract specifications; commissions and swaps can be included with a manual correction.
- Tracks daily drawdown from a persistent start-of-day equity snapshot, including realized and configured floating P&L while excluding same-day deposits from the loss limit.
- Filters history and statistics by date, account, Session, and instrument. Equity growth uses date on the X axis and account value in USD on the Y axis.
- Exports monthly account reports as Markdown, portfolio summaries as Markdown, trades as CSV, and a ZIP backup that includes screenshots. ZIP and JSON backups can be imported.
- Keeps local data available offline and synchronizes each signed-in user's records under `users/{uid}`.

## Firebase setup

Email/Password and Google sign-in must be enabled in Firebase Authentication. Add the hosted app domain under Authentication → Settings → Authorized domains. Publish the rules in [`database.rules.json`](database.rules.json) and [`storage.rules`](storage.rules); the latter is required for cross-device screenshot sync. See [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) for the steps.

P&L auto-calculation remains disabled until a contract multiplier is set for an instrument. Configure it using the broker's contract specification. This keeps instruments such as Gold, crypto, indices, and FX from silently sharing an incorrect multiplier.

## Build the Android app

```sh
npm install
npx cap sync android
cd android
gradlew.bat assembleDebug
```

The Android package ID remains `com.snoopy.retrotradingjournal` so the updated APK can replace an existing installation. The app version is 1.1.

## Links

- Web app: https://snoopy1989doo-source.github.io/owl-trading-journal/
- Repository: https://github.com/snoopy1989doo-source/owl-trading-journal
- Store planning: [`STORE_LAUNCH_ROADMAP.md`](STORE_LAUNCH_ROADMAP.md)
