# NPC: postavy příběhu

Postavy z hospody eRko a okolí. U každé: kdo to je, výhoda a nevýhoda pro hráče, kde ji najdeš,
co o ní řekne Plotková (dialog „Kdo jsou ti chlapi u stolu?“) a pár hlášek.
Výhody a nevýhody se jako mechaniky zapnou ve fázi P2 (viz [docs/PRIBEH.md](docs/PRIBEH.md)).

Hlášky jsou návrhy, doladíme je při implementaci.

---

## Štamgasti eRka

### Vesta
- **Kdo:** Bohatý čurák, pořád má nějaké blbé řeči.
- **Výhoda:** Pomůže vždycky.
- **Nevýhoda:** Blbé kecy, do očí.
- **Kde:** U stolu u okna, objednává za všechny a pak to všem připomíná.
- **Plotková:** „Vesta. Má prachy, chytrej není. Kdyby se kecy daly prodat, koupil by celou Morávku. Dvakrát.“
- **Hlášky:** „Já bych to koupil, ale nechci, aby ses cítil chudej.“ / „Moje auto má víc koní než celý Raškovice.“ / „Pomůžu ti. Ale řeknu to všem.“
- **Otázka:** Je to stejná postava jako dealer **Veseta** u obecního úřadu (prodává zbraně pod pultem)? A neprůstřelná vesta v HUDu se taky jmenuje „Vesta“ (viz ADR-009).

### Omyx
- **Kdo:** Střelený zhulený dealer trávy, hlasitý, občas se popere.
- **Výhoda:** Prodává trávu (když za ním dojdeš) a poradí, jak na koho jít.
- **Nevýhoda:** Po rozhovoru s ním hráčova postava pořád mele, že chce hulit a chce za Omyxem.
- **Kde:** Ve hře už stojí u řeky a prodává trávu; v eRku sedí u stolu nejblíž dveřím (viz ADR-010).
- **Plotková:** „Omyx. Neptej se, co prodává. Teda… ptej se, on ti to stejně řekne. Nahlas.“
- **Hlášky:** „Zelený? Domácí, z Beskyd.“ / „Na Metějku jdi zezadu, zepředu má ústa.“ / „Kdo říkal, že se peru? Já se jen hlasitě objímám.“

### Metějka
- **Kdo:** Strašný čurák, namyšlený, egoistický, pořád má blbé kecy.
- **Výhoda:** Když jsi poblíž něj, policie se vyhýbá. Nikdo nechce mít s Metějkou nic společného. Neumí hrát kulečník.
- **Nevýhoda:** Bude řešit, kde má pivo, bez ohledu na cokoli, a chce se hádat.
- **Kde:** U kulečníku, prohrává a tvrdí, že vyhrává.
- **Plotková:** „Metějka. Když přijde, policajti přejdou na druhou stranu silnice. Já taky.“
- **Hlášky:** „Kde je moje pivo? Kdo mi vypil pivo? TY?“ / „Kulečník je o hlavě. Já mám hlavu.“ / „Hádat se nechci. Ale máš blbě.“

### Zjebal
- **Kdo:** Vysmátý přátelský neonácek, rád chlastá a dobře se baví.
- **Výhoda:** Umí řídit těžké stroje (náklaďák a podobně).
- **Nevýhoda:** Musí být brzy doma kvůli manželce.
- **Kde:** U baru, směje se všemu, i když tomu nerozumí.
- **Plotková:** „Zjebal. Hodnej, dokud nezačne mluvit o politice. Naštěstí v deset musí domů, žena mu jinak zamkne.“
- **Hlášky:** „Hehe, dobrý, dobrý!“ / „Náklaďák? Dám ti ho zaparkovat i do kurníku.“ / „Ještě jedno a jdu. Ne, fakt. Žena.“
- **Pozor:** Žádné symboly, pozdravy ani nenávistné hlášky. Vtip je na jeho účet, ne na účet jiných (ADR-007).

### Vysoký Denny
- **Kdo:** Tichý přátelský mechanik. Umí zmizet auto. I člověka.
- **Výhoda:** Přebarví a opraví auto.
- **Nevýhoda:** Moc neporadí.
- **Kde:** U zdi u kulečníku, opřený, mlčí.
- **Plotková:** „Vysoký Denny. Spraví ti auto, přelakuje, a kdyby bylo potřeba, tak i zmizí. Na co se ho zeptáš, odpoví ‚hm‘.“
- **Hlášky:** „Hm.“ / „Dovez ho. Udělám.“ / „Co auto? Jaký auto?“
- **Otázka:** Má nahradit Autoúpravy Dan (dnešní garáž), nebo být druhá možnost vedle nich?

### Denny sochař
- **Kdo:** Chudý, pořád něco chce, pořád si stěžuje.
- **Výhoda:** Zbavit se ho.
- **Nevýhoda:** Pořád si chce půjčit peníze (volba ano / ne).
- **Kde:** U konce baru, nad prázdnou sklenicí.
- **Plotková:** „Denny sochař. Sochá hlavně dluhy. Nepůjčuj mu, nebo mu půjč a zapomeň na to.“
- **Hlášky:** „Nemáš stovku? Vrátím. Fakt. Asi.“ / „Umění se v Beskydech nenosí.“ / „Mám rozdělanou sochu Lysé hory. Zatím je to kámen.“
- **Otázka:** „Výhoda: zbavit se ho“ znamená, že ho jde odbýt a dá pokoj? Nebo něco jiného?

### Prchard
- **Kdo:** Hospodský, majitel eRka.
- **Výhoda:** Zná všechny.
- **Nevýhoda:** Určuje cenu piva (podle toho, jak se k němu chováš).
- **Kde:** Za barem, u pípy.
- **Plotková:** „Prchard. Šéf. Zná každýho od Frýdku po Lysou. Když ho naštveš, pivo zdraží. Mně ne, já ho piju zadarmo.“
- **Hlášky:** „Zavři, táhne. Co to bude?“ / „Čtyřicet pět. Pro tebe padesát.“ / „Tady se neplatí kartou. Tady se platí.“

### Kibi
- **Kdo:** Divnostvor, lamač ženských srdcí.
- **Výhoda:** Přátelský, pomůže.
- **Nevýhoda:** Chodí za ním ženy.
- **Kde:** U šipek, kolem něj vždycky nějaká návštěva.
- **Plotková:** „Kibi. Nevím, co na něm ženský vidí. Teda vím. Neřeknu.“
- **Hlášky:** „Pomůžu ti, jasně. Jen jestli někdo bude hledat Kibiho, nejsem tu.“ / „Šipky jsou jako láska. Většinou se netrefíš.“

---

## Obsluha

### Plotková
- **Kdo:** Servírka v eRku. Pěkná, ne příliš moudrá, věčně opilá, sdílná.
- **Výhoda:** Nasměruje hráče (řekne, kdo je kdo a kam jít).
- **Nevýhoda:** Chce panáky.
- **Kde:** Mezi barem a stoly, s tácem, který se kymácí víc než ona.
- **Hlášky:** „Plotková. Neříkej mi Plotičko, to smí jen Kibi.“ / „Dáš panáka? Tak dva.“ / „Princezna? Hele, to mi naposled řekl Zjebal a pak si spletl dveře.“

---

## Venku

### Paní Kordulová (návrh)
- **Kdo:** Místní důchodkyně na lavičce u zastávky před eRkem. Vidí všechno, komentuje všechno.
- **Role:** První postava, kterou hráč potká po vystoupení z autobusu. Sarkasticky ho pošle do hospody.
- **Hlášky:** „Vypadáš žíznivě. Nejbližší hospoda je eRko. Nejvzdálenější taky, jiná tu není.“ / „S takovým čírem tě do kostela nepustí. Do eRka jo, tam pustí i prase.“

### Veseta
- **Kdo:** Dealer u obecního úřadu, prodává „pod pultem“ zbraně, vestu a lékárničky (už ve hře).

### Zmínění, zatím bez role
- **Lakatoš** (Dřevaři ho pořád hledají, má klíče od traktoru), **pan Franta** (rozhlas: odjel autem z hospody).
