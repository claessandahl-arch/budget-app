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

### 🔧 Admin-läge
- [ ] Separat Admin-sida (`/app/admin`)
- [ ] Radera alla transaktioner (med bekräftelse)
- [ ] Radera alla importprofiler
- [ ] Radera alla kategorier
- [ ] Återställ budget till default
- [ ] Databasstatistik (antal rader per tabell)
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
