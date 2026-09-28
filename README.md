# Motion Runner — Smart Motion Coach

ADMIT Hackathon үшін жасалған браузерлік motion-controlled runner.

## Негізгі идея

Motion Runner — кәдімгі webcam-ды ойын контроллеріне айналдырады. Қолданушы кейіпкерді дене қозғалысымен басқарады:

- солға еңкею → сол жолаққа ауысу
- оңға еңкею → оң жолаққа ауысу
- екі қолды жоғары көтеру → секіру
- төмен отыру → кедергіден жалтару

Жобаның ерекшелігі — **Smart Motion Coach**. Жүйе қимылды тек "танылды / танылмады" деп бөлмейді. Қозғалыстың қаншалықты дұрыс орындалғанын бағалайды және нақты түзету кеңесін береді.

## Error Mode

Мысалдар:

- «Екі қолыңды да иықтан жоғары көтер.»
- «Басыңды ғана емес, иығың мен денеңді солға көбірек жылжыт.»
- «Тізеңді көбірек бүгіп, жамбасыңды төменірек түсір.»
- «Камерадан сәл алысырақ тұрып, денеңді толық кадрға сыйғыз.»

Бұл логика `src/motion/analyzer.ts` ішінде өз ережелерімізбен жасалған.

## Архитектура

```text
Webcam
  ↓
MediaPipe Pose Landmarker
  ↓
33 body landmarks
  ↓
Calibration
  ↓
Custom Motion Analyzer
  ↓
Motion Stabilizer
  ↓
Smart Error Coach
  ↓
Runner Game Engine
  ↓
Final Motion Report
```

## Неге MediaPipe тек көмекші құрал?

MediaPipe тек дененің landmark координаттарын береді. LEFT / RIGHT / JUMP / CROUCH классификациясы, confidence, near-correct movement және correction feedback логикасы жобаның өз кодында есептеледі.

## Қолданылған технологиялар

- React
- TypeScript
- Vite
- MediaPipe Tasks Vision
- Canvas API
- CSS
- Browser WebRTC/getUserMedia

Backend қажет емес. Камера видеосы серверге жіберілмейді.

## Іске қосу

```bash
npm install
npm run dev
```

Сосын терминалда көрсетілген localhost адресін браузерден ашыңыз.

## Production build

```bash
npm run build
npm run preview
```

## Deploy

Vercel/Netlify/Cloudflare Pages арқылы deploy жасауға болады.

Камера production сайтта HTTPS арқылы жұмыс істеуі тиіс.

## Demo flow

1. Landing
2. Camera permission
3. 3 секунд calibration
4. 4 motion tutorial
5. 60 секунд runner
6. Smart error feedback
7. Final motion report

## Hackathon demo кезінде міндетті түрде көрсету

1. Солға/оңға қозғалыс
2. Дұрыс jump
3. Әдейі қате jump — жүйенің нақты correction беруі
4. Crouch
5. Combo/score
6. Финалдық Motion Report

## Келесі жақсартулар

- дыбыс пен haptic feedback
- localStorage leaderboard
- difficulty levels
- phone portrait mode
- boss challenge
- персоналды threshold auto-tuning
- gesture heatmap
- replay summary
