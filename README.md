# 🦉 OWL TRADING JOURNAL (V.3.9 STATION) 📊

Gamified 8-Bit Retro RPG trading station & psychological risk manager for forex/crypto traders.

🎮 **Core Features:**
- **🦉 Owl Mascot & Retro 8-Bit Theme**: Authentic pixel art UI, CRT monitor scanline filter, and sound effects.
- **🛡️ % Daily Drawdown (DD) Risk Engine**: Calculate daily drawdown based on Starting Balance of the day (e.g. 5% Max DD limit).
- **❤️ Retro Daily Risk HP Bar**: Dynamic HP life gauge tracking remaining daily loss tolerance (Green > 50%, Yellow 1%-50%, Red 0% Game Over).
- **🧠 Max Consecutive Loss Lock (2 Hours Cooldown)**: เมื่อแพ้ (SL) ครบ 2 ไม้ในวันเดียว ระบบล็อกปุ่มบันทึกไม้ใหม่ชั่วคราว 2 ชั่วโมง พร้อมตัวนับเวลาถอยหลังแบบเรียลไทม์เพื่อบังคับพักสมองและป้องกัน Revenge Trading.
- **📊 CSV Export for AI Agents (Agent_Shark / Agent_Bee)**: ปุ่ม Export ข้อมูลสถิติไม้เทรดเป็น CSV พร้อมการคำนวณ R:R, PnL, Psychology, Timeframe รองรับทั้ง Export ตาม Filter (รายเดือน/รายสัปดาห์) และ Export ทั้งหมดใน Settings.
- **⚠️ 2-Level Alert System**:
  - *Level 1 (70% DD used)*: Caution warning to reduce lot size.
  - *Level 2 (100% DD reached)*: Hard Stop alarm & discipline prompt to prevent revenge trading.
- **📡 Real-Time Cloud Sync (Zero Data Loss)**: Live cross-device synchronization between Mobile and PC via Firebase Realtime Database with Smart Merge.
- **📱 Standalone Android APK**: Package ready with Capacitor (`Owl-Trading-Journal.apk`).
- **Multi-Account Support**: Manage multiple accounts (Demo, LIFE, RISK, Swingtrade, Custom accounts).
- **Equity Curve & Deep Analytics**: Profit factor, expectancy, weekday matrix, calendar diary, and action ratio pie charts.
- **Offline First**: Full offline support with LocalStorage and auto-sync when online.

📱 **Repository:**
https://github.com/snoopy1989doo-source/retro-trading-journal

🗺️ **Commercial & Store Roadmap:**
See [STORE_LAUNCH_ROADMAP.md](STORE_LAUNCH_ROADMAP.md) for full App Store & Google Play Store release guidelines.

## Tech Stack
- Vanilla HTML5, CSS3, Modern JavaScript
- Capacitor 7 (Android Native Wrapper)
- Firebase Realtime Database (Real-time listener & isolated node)
- Web Audio API (Retro 8-bit sound synthesizers)
- LocalStorage caching engine

## License
MIT