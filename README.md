#  Motion Runner — Smart Motion Coach

> **Run with your body. Improve every move.**

**Motion Runner** — ADMIT Hackathon 2026 үшін жасалған браузерлік motion-controlled runner.

Жоба кәдімгі веб-камераны ойын контроллеріне айналдырады. Қолданушы пернетақта мен тышқанды қолданбай, тек дене қозғалыстары арқылы кейіпкерді басқарады.

Бірақ Motion Runner тек қозғалысты танумен шектелмейді.

Жүйедегі **Smart Motion Coach** қозғалыстың қаншалықты дұрыс орындалғанын бағалайды және қате немесе толық емес қимыл кезінде оны қалай түзету керегін нақты көрсетеді.

---

#  Жобаның мақсаты

Кәдімгі веб-камера арқылы адамның дене қозғалысын real-time режимінде анықтап, сол қозғалыстарды толыққанды ойын механикасына айналдыру.

Негізгі цикл:

```text
Адам қозғалыс жасайды
        ↓
Камера қозғалысты көреді
        ↓
MediaPipe дене landmark-тарын анықтайды
        ↓
Біздің алгоритм қозғалысты талдайды
        ↓
Қозғалыс классификацияланады
        ↓
Ойын әрекет жасайды
        ↓
Smart Motion Coach feedback береді
```

---

#  Басқару

Motion Runner төрт негізгі дене қозғалысын таниды.

| Қозғалыс | Ойын әрекеті |
|---|---|
| ← Солға еңкею | Кейіпкер сол жолаққа ауысады |
| → Оңға еңкею | Кейіпкер оң жолаққа ауысады |
| ↑ Екі қолды жоғары көтеру | Кейіпкер секіреді |
| ↓ Төмен отыру | Кейіпкер кедергіден жалтарады |

Барлық басқару веб-камера арқылы орындалады.

Пернетақта немесе тышқан негізгі gameplay кезінде қажет емес.

---

#  Smart Motion Coach

Motion Runner-дің негізгі ерекшелігі — **Smart Motion Coach**.

Көптеген gesture-control жүйелері тек:

```text
Gesture detected
```

немесе:

```text
Gesture not detected
```

деп жауап береді.

Ал Motion Runner қозғалыстың **неге дұрыс немесе қате болғанын** талдайды.

Мысалы:

```text
JUMP — 94%

PERFECT
Қозғалыс дұрыс орындалды.
```

немесе:

```text
JUMP — 63%

Секіру толық емес.
Екі қолыңды иықтан жоғары көтер.
```

---

#  Error Mode

ADMIT Hackathon талаптарының негізгі бөліктерінің бірі — қате қозғалыстарды анықтап, қолданушыға нақты correction беру.

Motion Runner-де бұл бөлік өз логикамыз арқылы жасалған.

Мысалдар:

### Jump

```text
Екі қолыңды да иықтан жоғары көтер.
```

Егер бір қол жеткілікті көтерілмесе:

```text
Сол қолыңды иықтан жоғарырақ көтер.
```

---

### Lean Left

```text
Солға еңкею әлсіз.

Басыңды ғана емес,
иығың мен денеңді солға көбірек жылжыт.
```

---

### Lean Right

```text
Оңға еңкею әлсіз.

Басыңды ғана емес,
иығың мен денеңді оңға көбірек жылжыт.
```

---

### Crouch

```text
Отыру жеткіліксіз.

Тізеңді көбірек бүгіп,
жамбасыңды төменірек түсір.
```

---

### Camera position

Егер дене толық көрінбесе:

```text
Денең толық көрінбей тұр.

Камерадан сәл алысырақ тұрып,
денеңді толық кадрға сыйғыз.
```

---

#  Motion Confidence

Жүйе әр қозғалысқа confidence score есептейді.

Мысалы:

```text
JUMP
94%

PERFECT
```

немесе:

```text
LEFT
72%

Қозғалысты күштірек орында.
```

Confidence қозғалыстың қаншалықты анық орындалғанын көрсету үшін қолданылады.

Қозғалыс бірнеше деңгейге бөлінеді:

```text
PERFECT
GOOD
WEAK
ERROR
```

---

#  Body Calibration

Әр адамның:

- бойы;
- дене пропорциясы;
- иық ені;
- камерадан қашықтығы

әртүрлі.

Сондықтан Motion Runner ойын басталар алдында **3 секундтық calibration** жасайды.

Calibration кезінде жүйе шамамен:

```text
shoulderWidth
neutralShoulderCenterX
neutralShoulderY
neutralHipY
torsoHeight
```

сияқты параметрлерді анықтайды.

Сондықтан қозғалыстар абсолютті пиксельдер бойынша емес, адамның өзінің дене пропорциясына қатысты есептеледі.

Мысалы:

```text
Shoulder center
      ↓

Neutral position: 0.50
Current position: 0.37

Delta: -0.13

→ LEFT movement
```

Бұл әртүрлі камера мен әртүрлі адамда gesture detection-ды тұрақтырақ етеді.

---

#  Custom Motion Recognition

MediaPipe біздің жобада дайын gesture classifier ретінде қолданылмайды.

MediaPipe тек дененің landmark координаттарын береді.

```text
Webcam
   ↓
MediaPipe Pose
   ↓
33 body landmarks
```

Ал ары қарай қозғалысты біздің код талдайды.

```text
33 Landmarks
      ↓
Geometry calculations
      ↓
Body calibration
      ↓
Custom thresholds
      ↓
Motion confidence
      ↓
LEFT / RIGHT / JUMP / CROUCH
```

Қозғалыс анализінің негізгі логикасы:

```text
src/motion/analyzer.ts
```

ішінде орналасқан.

---

#  Motion Stabilizer

Камера секундына көптеген frame өңдейді.

Егер gesture әр frame-де бірден орындалса:

```text
LEFT
LEFT
LEFT
LEFT
LEFT
```

болып, кейіпкер бірден бірнеше жолаққа ауысып кетуі мүмкін.

Сондықтан Motion Runner ішінде gesture state stabilization қолданылады.

Жалпы схема:

```text
IDLE
  ↓
CANDIDATE
  ↓
CONFIRMED
  ↓
COOLDOWN
  ↓
IDLE
```

Бұл бір қозғалыстың бірнеше рет қайталанып trigger болуын азайтады.

---

#  Runner Game Engine

Ойын үш жолақты runner принципімен жұмыс істейді.

```text
LEFT LANE | CENTER LANE | RIGHT LANE
```

Кейіпкер автоматты түрде алға қозғалады.

Жолда әртүрлі obstacle пайда болады.

Мысалы:

```text
Barrier
   ↓
JUMP қажет
```

```text
Overhead obstacle
   ↓
CROUCH қажет
```

```text
Lane obstacle
   ↓
LEFT немесе RIGHT қажет
```

---

# Score және Combo

Ойын тек obstacle өтумен шектелмейді.

Қозғалыстың сапасына байланысты қосымша score беріледі.

Мысалы:

```text
PERFECT MOVE
+50
```

```text
GOOD MOVE
+20
```

Obstacle дұрыс өткен кезде:

```text
+100
```

Combo сақталған сайын қосымша bonus өседі.

```text
x2 COMBO

x3 COMBO

x5 COMBO
```

Қате жіберілсе:

```text
COMBO RESET
```

---

#  HUD Interface

Motion Runner интерфейсі motion analytics dashboard стилінде жасалған.

Негізгі дизайн:

```text
Dark / brown-black background
Orange accent
Motion HUD
Analytics cards
Real-time camera feed
Pose overlay
AI Coach feedback
Score dashboard
```

Gameplay кезінде экран шамамен мына структурада жұмыс істейді:

```text
┌──────────────────────────────────────────────┐
│ MOTION RUNNER              LIVE SESSION      │
├─────────────────────┬────────────────────────┤
│                     │ AI COACH FEEDBACK      │
│                     │                        │
│ LIVE CAMERA         │ FORM: 94%              │
│                     │ PERFECT                │
│ + BODY SKELETON     │                        │
│                     │ Correction feedback    │
│                     ├────────────────────────┤
│                     │ TOTAL SCORE            │
│                     │ COMBO                  │
│                     │ TIMER                  │
└─────────────────────┴────────────────────────┘
```

---

#  Final Motion Report

60 секундтық session аяқталғаннан кейін пайдаланушы толық motion report алады.

Көрсетілетін ақпарат:

```text
Final Score
Motion Accuracy
Perfect Moves
Good Moves
Errors
Total Moves
Best Combo
Weakest Motion
Smart Coach Recommendation
```

Мысалы:

```text
SESSION COMPLETE

FINAL SCORE
8 420

MOTION ACCURACY
88%

PERFECT MOVES
14

ERRORS
3

MAX COMBO
x8
```

Smart Coach соңында ең әлсіз қозғалысты көрсетеді.

```text
Жетілдіретін қимыл:

CROUCH
```

және recommendation береді.

---

#  Архитектура

```text
Webcam
  ↓
MediaPipe Pose Landmarker
  ↓
33 Body Landmarks
  ↓
Body Calibration
  ↓
Custom Motion Analyzer
  ↓
Motion Confidence
  ↓
Motion Stabilizer
  ↓
Smart Error Coach
  ↓
Runner Game Engine
  ↓
Score / Combo
  ↓
Final Motion Analytics
```

---

# Project Structure

```text
motion-runner/

├── public/
│   │
│   ├── models/
│   │   └── pose_landmarker_lite.task
│   │
│   └── wasm/
│       ├── vision_wasm_internal.js
│       ├── vision_wasm_internal.wasm
│       ├── vision_wasm_module_internal.js
│       ├── vision_wasm_module_internal.wasm
│       ├── vision_wasm_nosimd_internal.js
│       └── vision_wasm_nosimd_internal.wasm
│
├── src/
│   │
│   ├── components/
│   │   ├── CameraPanel.tsx
│   │   ├── FeedbackCard.tsx
│   │   └── GameView.tsx
│   │
│   ├── motion/
│   │   ├── analyzer.ts
│   │   ├── calibration.ts
│   │   ├── geometry.ts
│   │   ├── poseTracker.ts
│   │   ├── stabilizer.ts
│   │   └── types.ts
│   │
│   ├── game/
│   │   ├── engine.ts
│   │   └── types.ts
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

# 🛠 Қолданылған технологиялар

### Frontend

- React
- TypeScript
- Vite

### Computer Vision

- MediaPipe Tasks Vision
- MediaPipe Pose Landmarker

### Browser APIs

- WebRTC
- `navigator.mediaDevices.getUserMedia()`
- Canvas API
- `requestAnimationFrame`

### Styling

- CSS
- Responsive HUD interface

---

#  Privacy

Motion Runner камера видеосын backend немесе сыртқы серверге жібермейді.

Pose processing браузердің ішінде орындалады.

Жалпы схема:

```text
Camera
  ↓
Browser
  ↓
MediaPipe
  ↓
Pose coordinates
```

Видео файл ретінде сақталмайды.

---

#  Орнату және іске қосу

## 1. Repository clone

```bash
git clone https://github.com/ajka3818-alt/motion-runner.git
```

## 2. Project folder

```bash
cd motion-runner
```

## 3. Dependencies орнату

```bash
npm install
```

Windows PowerShell execution policy `npm.ps1`-ді блоктаса:

```powershell
npm.cmd install
```

## 4. Development server

```bash
npm run dev
```

Windows PowerShell үшін:

```powershell
npm.cmd run dev
```

Терминалда:

```text
Local: http://localhost:5173/
```

сияқты адрес шығады.

Сол URL-ды Chrome немесе Edge браузерінде ашыңыз.

---

# Production Build

Production build жасау:

```bash
npm run build
```

Windows PowerShell:

```powershell
npm.cmd run build
```

Build тексеру:

```bash
npm run preview
```

немесе:

```powershell
npm.cmd run preview
```

---

# 🎬 Demo Flow

Жобаның толық сценарийі:

```text
Landing Page
      ↓
Camera Activation
      ↓
Body Detection
      ↓
3 Second Calibration
      ↓
Motion Tutorial
      ↓
LEFT
RIGHT
JUMP
CROUCH
      ↓
60 Second Runner
      ↓
Real-time Smart Coach
      ↓
Score + Combo
      ↓
Final Motion Report
```

---

# 🎤 Hackathon Demo

Жюри алдында демонстрацияны мына ретпен көрсетуге болады:

### 1. Landing

Motion Runner концепциясын қысқаша түсіндіру.

> Камера — біздің контроллеріміз.

---

### 2. Camera

Камераны қосып, skeleton tracking көрсету.

---

### 3. Calibration

Жүйенің пайдаланушы денесіне автоматты бейімделетінін көрсету.

---

### 4. LEFT / RIGHT

Денені солға және оңға еңкейтіп lane ауыстыру.

---

### 5. Correct JUMP

Екі қолды жоғары көтеру.

```text
PERFECT JUMP
94%
```

---

### 6. Error Mode

Әдейі бір қолды төмен қалдыру.

Жүйе:

```text
Сол қолыңды иықтан жоғарырақ көтер.
```

сияқты нақты correction көрсетуі керек.

Бұл demo-ның ең маңызды бөліктерінің бірі.

---

### 7. CROUCH

Төмен отырып obstacle-дан өту.

---

### 8. Score / Combo

Ойын score және combo есептейтінін көрсету.

---

### 9. Final Motion Report

Session аяқталған кезде:

```text
Accuracy
Perfect Moves
Errors
Best Combo
Weakest Motion
Recommendation
```

көрсету.

---

#  Motion Runner-дің ерекшелігі

Motion Runner тек:

```text
"Қандай қозғалыс жасалды?"
```

деген сұраққа жауап бермейді.

Ол:

```text
"Қозғалыс қаншалықты дұрыс жасалды?"
```

және:

```text
"Оны қалай жақсартуға болады?"
```

деген сұрақтарға да жауап береді.

Сондықтан біздің негізгі концепция:

> **Don't just detect the movement — understand the movement.**

---

#  Болашақ жақсартулар

Келесі нұсқаларда қосуға болатын мүмкіндіктер:

- дыбыс эффектілері
- leaderboard
- session history
- localStorage арқылы рекорд сақтау
- adaptive difficulty
- phone portrait mode
- boss challenge
- automatic threshold tuning
- advanced motion heatmap
- replay analysis
- multiplayer motion challenge
- gesture-based menu navigation
- personal motion profile

---

#  Hackathon

**ADMIT Hackathon 2026**

**Track:** MOTION — Камера вместо джойстика

**Project:** Motion Runner — Smart Motion Coach

---

## Team

**Queens**

Built for **ADMIT Hackathon 2026**.
