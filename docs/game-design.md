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

## 3. Prima versione scartata

I primi 21 giochi erano test di percezione (indovina il colore, la proporzione...). Giudizio: "poco creativi, da prima media". Sono stati tutti eliminati.

Nuova regola, sopra tutte le altre:

- **R0. Il gameplay genera l'opera.** Ogni partita deve divertire e lasciare un'opera da scaricare (quadro, stampa, poster, vaso 3D, mandala...). Più giochi bene, più l'opera è bella.

## 4. Giochi attuali (15 + i Folli + il museo)

| Gioco | Si gioca | Ti porti a casa |
|---|---|---|
| Raffica | cannone di vernice contro i Censori grigi | quadro PNG + palette |
| Palette Wars | goccia stile agar.io che si mescola con ciò che mangia | mappa dipinta + palette |
| Riso Press | timing sui registri di stampa, 4 livelli di colore | stampe riso |
| Glitch Guardian | schiacci i bug che corrompono l'opera | glitch art |
| Neon Bender | segui la scintilla lungo il tuo nome | insegna al neon PNG/SVG |
| Pattern DJ | rhythm game a 4 tasti | piastrella SVG + pattern |
| Tipo Tempesta | lettere che cadono | poster svizzero |
| Torre Bauhaus | impila blocchi | poster della torre |
| Prisma Runner | runner a 3 corsie | poster spettro + palette |
| Light Painting | prendi le luci dalla profondità | lunga esposizione |
| Tornio | modelli argilla 3D su ordinazione | OBJ + PNG |
| Collage | tagli ritagli al volo | collage |
| Writer Notturno | tag col tuo nome evitando la torcia | muro dipinto |
| Caleido Blaster | difendi il centro, colpi a specchio x8 | mandala |
| Inchiostro Vivo | pennello lungo un rotolo | rotolo dipinto |

### I Folli (categoria `folle`, colore acido #C6FF00)

Giochi con una grafica estrema e d'avanguardia: ognuno usa una tecnica visiva diversa e la trasforma in gameplay.

| Gioco | Tecnica visiva | Si gioca | Ti porti a casa |
|---|---|---|---|
| Vortice | psichedelia anni 60 (spirali logaritmiche, anelli liquidi) | anelli che si stringono, giri intorno al centro e passi nei varchi | poster da concerto col tuo nome che si scioglie |
| Brodo Primordiale | reazione-diffusione Gray-Scott in WebGL | semini vita chimica che cresce da sola, schiacci i fagi, conquisti superficie | PNG del pattern vivo |
| Drift Acido | pavimento che si scioglie, sgommate al neon | drift tra le porte, punti che si incassano quando raddrizzi | pittura a sgommate |
| Loop Infinito | feedback video in WebGL (zoom, rotazione, hue shift) | serpente che mangia occhi, le curve fanno girare il tunnel | fotogrammi scattati + ultimo fotogramma |

Test con le regole: tutti passano R0, R1, R3, R6 (60–70 s), R7, R10 (dito: tieni premuto o punta), R11. R8: Drift Acido (rischio del drift in corso), Brodo (inchiostro limitato), Vortice (passare rasente vale doppio), Loop (catena di occhi veloci, occhio d'oro). Luci lampeggianti segnalate nelle istruzioni; con "riduci movimento" gli effetti più forti si spengono.

## 5. Il Museo Maledetto (il gioco grande)

- Doom-like in un museo di notte: 40 sale, ognuna un quadro inquietante dal 1400 al 1900 (Bosch, Bruegel, Grünewald, Goya, Füssli, Böcklin, Munch, Ensor, Bacon...).
- I soggetti del quadro sono usciti come mostri: aspetto e poteri cambiano per ogni opera (artigli, sciame, volo, carica, sputo, scissione, restauro, salto, sguardo, velatura, divora, evoca, urlo, ragnatela).
- Colpito a morte, il mostro torna volando nella cornice vuota più vicina. Sala vuota = quadro restaurato (scaricabile).
- Difficoltà crescente (numero, vita, velocità, danno, cadenza). Boss ogni 5 sale, e ogni 5 sale si sblocca un ingresso. Sala XXV è un'impresa, XL è brutale.
- Regole applicate: R0 (galleria dei quadri restaurati), R4 (sangue, urla, sussurri, vibrazione), R5 (flow con curva di difficoltà), R7 (punti per anima, bonus vita e mira, classifica locale), R10 (joystick, trascinamento e tasti grandi su telefono).
- Le opere nel gioco sono omaggi procedurali, non riproduzioni.
- Doppio controllo: test automatici su tutte le 40 sale (caricamento, IA, abilità, completamento, morte, input da tastiera, mouse e touch, telefono verticale e orizzontale).
