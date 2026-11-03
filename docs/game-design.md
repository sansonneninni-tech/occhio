# Occhio — regole di game design e test delle idee

## 1. Testi studiati e regole estratte

Fonti: **Jesse Schell, _The Art of Game Design: A Book of Lenses_** · **Raph Koster, _A Theory of Fun for Game Design_** · **Steve Swink, _Game Feel_** (con Tracy Fullerton, _Game Design Workshop_, per gli elementi formali).

| # | Regola | Da dove viene | Come la verifichiamo |
|---|--------|---------------|----------------------|
| R1 | **Obiettivo chiaro in 5 secondi.** Il giocatore capisce cosa fare senza leggere un manuale. | Fullerton (elementi formali: obiettivo, procedure, esito); Schell, lente dell'obiettivo | Regola spiegabile in una riga |
| R2 | **Divertimento = imparare uno schema.** Ogni partita deve allenare una abilità reale dell'occhio. | Koster, "fun is learning" | Un giocatore migliora dopo 3 partite |
| R3 | **Abilità > fortuna.** Il punteggio dipende da quanto sei bravo, non dal caso. | Schell, lente dell'abilità vs probabilità | Il punteggio è misurabile in modo oggettivo (ΔE, pixel, gradi) |
| R4 | **Feedback immediato e "succoso".** Ogni azione riceve risposta < 100 ms: animazione, suono, vibrazione. | Swink, game feel; "juice it or lose it" | Ogni input ha una risposta visibile |
| R5 | **Flusso: difficoltà che sale.** Facile all'inizio, poi stringe. | Csikszentmihalyi via Schell, lente del flusso | Round con soglia via via più stretta |
| R6 | **Ciclo corto, rivincita istantanea.** 30–90 secondi, "ancora una" a un tocco. | Koster (sessioni brevi), Schell lente del tempo | Durata ≤ 90 s, bottone Rigioca |
| R7 | **Competizione leggibile.** Punteggio, combo, rango (S/A/B/C), record personale e classifica. | Schell, lente della competizione | Punti, rango e record visibili a fine partita |
| R8 | **Scelte significative sotto pressione.** Il tempo crea tensione: rischiare per più punti o andare sicuri. | Schell, lente della scelta; Sid Meier | Bonus velocità o combo |
| R9 | **Giocattolo prima che gioco.** Anche senza obiettivo, toccare e muovere è piacevole. | Schell, lente del giocattolo | Interazione diretta (trascinare, ruotare) |
| R10 | **Funziona col dito.** Bersagli ≥ 44 px, niente hover obbligatorio, niente tastiera necessaria. | Linee guida mobile | Giocabile su telefono |
| R11 | **Ti porti a casa qualcosa.** Risultato o materiale esportabile (palette, SVG, PNG, card). | Richiesta del progetto | Almeno una esportazione |

**Soglia:** un gioco passa se rispetta tutte le regole R1, R3, R6, R7, R10 (bloccanti) e almeno 4 delle altre 6.

## 2. Tutte le idee (20 iniziali + 18 nuove) e test

Legenda: ✓ rispettata · ✗ no · ~ in parte. **B** = bloccante fallita.

| Idea | R1 | R2 | R3 | R4 | R5 | R6 | R7 | R8 | R9 | R10 | R11 | Esito |
|------|----|----|----|----|----|----|----|----|----|-----|-----|-------|
| Furto di Tinta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Ponte di Sfumature | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Vigile del Contrasto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | **Passa** |
| Palette dell'Umore | ~ | ~ | ✗ B | ✓ | ✗ | ✓ | ✗ B | ✗ | ✓ | ✓ | ✓ | Scartata: giudizio soggettivo |
| Detective Daltonico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | **Passa** |
| Flash Cromatico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | **Passa** |
| Ruota dell'Armonia | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Corsa alla Griglia | ✓ | ✓ | ✓ | ✓ | ~ | ✗ B | ✓ | ~ | ✓ | ~ | ✓ | Scartata: troppo lunga e scomoda col dito |
| Cecchino di Font | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | **Passa** |
| Pilota Bézier | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** (come "Curva Gemella") |
| Pixel Perfetto | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | **Passa** |
| Spremi il Logo | ~ | ✓ | ✗ B | ✓ | ~ | ✓ | ✗ B | ✓ | ✓ | ✓ | ✓ | Scartata: "riconoscibile" non è misurabile |
| Set di Luci | ~ | ✓ | ✓ | ✓ | ~ | ✗ B | ✓ | ✓ | ✓ | ~ | ✓ | Scartata: troppo lenta; sostituita da "Da Dove Viene la Luce" |
| Doppia Ombra | ~ | ✓ | ✓ | ✓ | ✓ | ✗ B | ✓ | ✓ | ✓ | ✗ B | ✓ | Scartata: lunga e difficile sul telefono |
| Scultore Low Poly | ~ | ✓ | ~ | ✓ | ~ | ✓ | ~ | ✓ | ✓ | ✗ B | ✓ | Scartata: controllo fine impossibile col dito |
| Indovina il Materiale | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Taglio d'Oro | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Un Solo Tratto | ✓ | ✓ | ✗ B | ✓ | ~ | ✓ | ✗ B | ✓ | ✓ | ✓ | ✓ | Rifatta come "Ricalco" (misurabile) |
| Cinque Grigi | ~ | ✓ | ✓ | ~ | ~ | ✗ B | ✓ | ~ | ~ | ~ | ✓ | Scartata: troppo lunga; idea assorbita in "Scala dei Valori" |
| Scontro di Stili | ~ | ~ | ✗ B | ✓ | ✗ | ✓ | ✗ B | ✓ | ✓ | ✓ | ✓ | Scartata: giudizio soggettivo |
| **Nuove idee** | | | | | | | | | | | | |
| Inganno di Albers (contrasto simultaneo) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | **Passa** |
| Scala dei Valori (ordina per luminosità) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Palette Estratta (contagocce) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Centro Ottico | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Raggio Coerente | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Proporzione Perfetta | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Da Dove Viene la Luce | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Rotazione Mentale | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | **Passa** |
| Punto di Fuga | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Ricalco | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **Passa** |
| Kerning a occhio | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | Scartata: troppo simile a un gioco esistente |
| Gerarchia in 3 secondi | ✓ | ✓ | ✗ B | ✓ | ~ | ✓ | ~ | ✓ | ~ | ✓ | ~ | Scartata: risposta discutibile |
| Ritmo 8pt | ✓ | ✓ | ✓ | ~ | ~ | ✓ | ✓ | ~ | ✗ | ✓ | ~ | Scartata: poco divertente (4 regole su 6 non piene) |
| Mescola Inchiostri CMY | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Rinviata: troppo simile a Furto di Tinta |
| Isometrico da tre viste | ~ | ✓ | ✓ | ✓ | ✓ | ✗ B | ✓ | ✓ | ✓ | ~ | ✓ | Scartata: lunga |
| Orbita la Camera (3D) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ~ | ✓ | Rinviata alla prossima ondata |
| Temperatura Caldo/Freddo | ✓ | ~ | ~ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ | ~ | Scartata: troppo banale |
| Mezzitoni (retino) | ~ | ✓ | ✓ | ✓ | ~ | ✓ | ✓ | ~ | ✓ | ✓ | ✓ | Rinviata alla prossima ondata |

## 3. Giochi sviluppati (21)

**Colore:** Furto di Tinta · Flash Cromatico · Vigile del Contrasto · Ruota dell'Armonia · Ponte di Sfumature · Inganno di Albers · Scala dei Valori · Detective Daltonico · Palette Estratta
**Design:** Centro Ottico · Raggio Coerente · Proporzione Perfetta · Pixel Perfetto · Curva Gemella · Cecchino di Font
**3D:** Indovina il Materiale · Da Dove Viene la Luce · Rotazione Mentale · Punto di Fuga
**Arte:** Taglio d'Oro · Ricalco

Ogni gioco: 5–8 round, tempo che stringe, combo, punteggio 0–1000, rango S/A/B/C/D, record personale, classifica dei nomi su questo dispositivo, esportazione (palette HEX/CSS/ASE/JSON, PNG, SVG, card del punteggio).
