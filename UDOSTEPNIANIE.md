# Klient do pobrania i automatyczne aktualizacje na bieżąco — „Kroniki Chaosu”

## Jak działają automatyczne aktualizacje dla wszystkich znajomych?

Klient desktopowy (**Kroniki Chaosu.app / .exe**) został zaprojektowany jako **Live-Loading Client**:
1. Gdy ma ustawiony adres serwera (np. Twój darmowy serwer na **Render.com** albo tunel `./share.sh`), ładuje najnowszą wersję gry **bezpośrednio z serwera** (z automatycznym powrotem do wbudowanego serwera offline, jeśli brak internetu).
2. Serwer pilnuje pliku `dist/version.json` i **co 5 sekund sprawdza, czy pojawiła się nowa wersja**. Gdy tylko dodasz zmianę i ją opublikujesz, **wszyscy aktualnie grający znajomi dostają w grze baner:**
   > **✨ NOWA AKTUALIZACJA GRY DOSTĘPNA!** `[ 🔄 Załaduj teraz ]`
   Jedno kliknięcie (bez utraty zapisanej postaci i bez ponownego pobierania `.dmg` / `.exe`) ładuje nowe modele 3D, balans i funkcje!

---

## Konfiguracja raz na zawsze (3 kroki, 2 minuty)

### Krok 1: Postaw darmowy serwer 24/7 z Auto-Deploy (Render.com)
1. Wrzuć folder `/Users/piotr/.gemini/antigravity/scratch/kroniki-chaosu` na GitHub.
2. Wejdź na [render.com](https://render.com) → **New + → Blueprint** → wybierz repozytorium (plik `render.yaml` skonfiguruje wszystko automatycznie, w tym Auto-Deploy po każdym `git push`).
3. Otrzymasz swój stały adres, np. `https://kroniki-chaosu.onrender.com`.

### Krok 2: Wpisz ten adres do klienta (raz!) i wyślij znajomym
Wpisz swój adres w pliku `electron/live-config.json`:
```json
{
  "defaultLiveServerUrl": "https://kroniki-chaosu.onrender.com"
}
```
Następnie zbuduj paczki raz:
```bash
npm run dist:mac     # macOS (.dmg i .zip w folderze release/)
npm run dist:win     # Windows (.exe w folderze release/)
```
*(Znajomi, którzy już mają pobranego klienta, mogą też wpisać ten adres ręcznie w Lobby klikając **`● SERWER LOKALNY ⚙️`** — klient zapamięta go na stałe!)*

### Krok 3: Publikowanie zmian na bieżąco (1 komenda!)
Gdy wprowadzisz tutaj jakąkolwiek zmianę w grze, uruchom:
```bash
./publish.sh "Opis Twojej zmiany"
```
* Zbuduje nową wersję z nowym `version.json`,
* Automatycznie wypchnie ją na GitHub → **Render.com zaktualizuje grę w ~45 s** dla wszystkich,
* A jeśli gracie lokalnie / przez `./share.sh`, wszyscy podłączeni gracze zobaczą baner aktualizacji w ciągu **5 sekund**!
