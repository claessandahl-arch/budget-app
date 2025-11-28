# Budget App - TODO / Backlog

## 🎯 Prioritet: Hög

### 🏷️ Kategorier-hantering
- [ ] UI för att skapa nya kategorier
- [ ] Redigera befintliga kategorier (namn, ikon)
- [ ] Ta bort kategorier (med varning om de används)
- [ ] Standardkategorier vid ny användare

### 🔍 Sök & Filter (Transaktioner)
- [ ] Sökfält för transaktioner (beskrivning)
- [ ] Filtrera på kategori
- [ ] Filtrera på datumintervall
- [ ] Filtrera på belopp (min/max)

### 📥 Förbättrad Import - Transaktionsklassificering
- [x] Manuell klassificering vid import (välj typ per rad)
- [x] Stöd för att importera till: Rörliga utgifter, Inkomster, Fasta utgifter, Sparande
- [ ] Tilldela kategori direkt vid import
- [x] Auto-föreslå typ baserat på belopp (+/-)
- [x] Dublettkontroll mot ALLA tabeller (transactions, incomes, fixed_expenses, savings)
- [x] Matchning visar vilken tabell dubbletten hittades i
- [x] Val vid matchning: Uppdatera/Skapa ny/Hoppa över

### 🔧 Admin-läge
- [x] Separat Admin-sida (`/app/admin`)
- [x] Radera alla transaktioner (med bekräftelse)
- [x] Radera alla importprofiler
- [x] Radera alla inkomster
- [x] Radera alla fasta utgifter
- [x] Radera alla sparanden
- [x] Databasstatistik (antal rader per tabell)
- [ ] Radera alla kategorier
- [ ] Återställ budget till default
- [ ] Export av all data (JSON/CSV)
- [ ] Import av backup-data

---

## 🎯 Prioritet: Medium

### 📊 Category Budgets
- [ ] UI för att sätta budgetmål per kategori
- [ ] Visa progress mot budget i Variable Expenses
- [ ] Varning när man närmar sig/överskrider budget
- [ ] Integration med Overview-dashboard

### 📸 Kvittobilder
- [ ] Ladda upp kvittobild till transaktion (Supabase Storage)
- [ ] Visa kvittobild i transaktionsdetaljer
- [ ] Bildkomprimering innan uppladdning
- [ ] Galleri-vy för alla kvitton

### 📈 Historik & Rapporter
- [ ] Jämför aktuell månad med tidigare månader
- [ ] Trenddiagram (utgifter över tid)
- [ ] Export till CSV/Excel
- [ ] Årssammanfattning

### 💳 Betalningsmetod
- [ ] Visa betalningsmetod på transaktioner
- [ ] Filtrera på betalningsmetod
- [ ] Statistik per betalningsmetod

---

## 🎯 Prioritet: Låg

### 📅 Monthly Summaries
- [ ] Automatisk caching av månadssammanfattningar
- [ ] Historikvy med alla månader
- [ ] Anteckningar per månad

### 🤖 AI-funktioner (Google Gemini)
- [ ] Läsa kvittotext automatiskt
- [ ] Föreslå kategori baserat på beskrivning
- [ ] Smart duplicering (liknande transaktioner)

### 🧠 Smart Import - Auto-klassificering (Fas 2)
- [ ] Keyword-baserad auto-klassificering (LÖN → Inkomst, SPOTIFY → Fast utgift)
- [ ] Lär sig från användarens tidigare klassificeringar
- [ ] Föreslå typ baserat på historik
- [ ] Regler per importprofil

### 📊 Fasta Utgifter - Månadsvis spårning (Fas 2)
- [ ] Ny tabell `fixed_expense_payments` kopplad till `fixed_expenses`
- [ ] Spara faktiskt belopp per månad/år för varje fast utgift
- [ ] Visa historik och variation över tid (el, ränta varierar)
- [ ] Beräkna budget som snitt eller senaste värde
- [ ] Graf för att visualisera kostnadsvariation

### 💰 Occurrence-tabeller för alla budgetposter (Fas 2)
- [ ] Ny tabell `income_payments` kopplad till `incomes`
- [ ] Ny tabell `saving_payments` kopplad till `savings`  
- [ ] Spåra faktiska betalningar per månad/budgetperiod
- [ ] Dublettkontroll: samma definition + samma period = hoppa över
- [ ] Dashboard: visa budget vs faktiskt per period
- [ ] Stöd för anpassningsbar budgetperiod (25:e till 24:e, lön-till-lön)

### 🔔 Notifikationer
- [ ] Påminnelse om fasta utgifter (due_day)
- [ ] Varning vid budgetöverskridning
- [ ] Vecko/månadsrapport via email

### 🌙 UX-förbättringar
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Drag-and-drop för kategorisering
- [ ] Bulk-redigering av transaktioner

---

## ✅ Klart

### Import-klassificering (2025-11-28)
- [x] Manuell klassificering vid import (välj typ per rad: Rörlig/Inkomst/Fast/Sparande/Hoppa över)
- [x] Auto-föreslå typ baserat på belopp (+/- → Inkomst/Rörlig)
- [x] Bulk-ändra typ för alla markerade rader
- [x] Global dublettkontroll mot ALLA tabeller vid parsning
- [x] Matchnings-UI med val: Uppdatera befintlig / Skapa ny / Hoppa över
- [x] Färgkodade badges för varje typ

### Admin-sida (2025-11-28)
- [x] Separat Admin-sida (`/app/admin`)
- [x] Databasstatistik (antal rader per tabell)
- [x] Bulk-radera: transaktioner, inkomster, fasta utgifter, sparanden, importprofiler
- [x] Bekräftelsedialoger med tydlig varning

### Import-förbättringar (2025-11-28)
- [x] Dubblettkontroll vid import (datum + belopp + beskrivning)
- [x] Visa profilnamn i notes istället för filnamn
- [x] MM/DD/YYYY datumformat (American Express)
- [x] Auto-invertera belopp för kreditkort
- [x] Förhindra dubletter av profilnamn
- [x] Uppdatera befintlig profil eller skapa ny
- [x] Förbättrad borttagning av profiler

---

## 📝 Anteckningar

- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS 4 + Supabase
- **Språk**: Svenska (UI)
- **Hosting**: Vercel (frontend) + Supabase (backend)
- **Budget**: 0 kr/månad (free tier överallt)
