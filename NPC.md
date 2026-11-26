# NPC: postavy příběhu

Hrdina nebo hrdinka (volba na začátku, jméno si hráč napíše sám) přijíždí do Morávky, protože na Instagramu vyskočila akce: v eRku je super festival.

Postavy z hospody eRko a okolí. U každé: kdo to je, výhoda a nevýhoda pro hráče, kde ji najdeš,
co o ní řekne Plotková (dialog „Kdo jsou ti chlapi u stolu?“) a pár hlášek.
Výhody a nevýhody se jako mechaniky zapnou ve fázi P2 (viz [docs/PRIBEH.md](docs/PRIBEH.md)).

Hlášky jsou návrhy, doladíme je při implementaci.

---

## Štamgasti eRka

### Vesta
- **Kdo:** Bohatý čurák v červené mikině, pořád má nějaké blbé řeči.
- **Mise (Akt 1):** *Jeřáb pro Vestu.* Ukrást autojeřáb na stavbě v Raškovicích a dovézt ho k jeho domu bez hvězd; celou cestu volá, jak to děláš špatně (ADR-026).
- **Výhoda:** Pomůže vždycky.
- **Nevýhoda:** Blbé kecy, do očí.
- **Kde:** U stolu u okna, objednává za všechny a pak to všem připomíná.
- **Plotková:** „Vesta. Má prachy, chytrej není. Kdyby se kecy daly prodat, koupil by celou Morávku. Dvakrát.“
- **Hlášky:** „Já bych to koupil, ale nechci, aby ses cítil chudej.“ / „Moje auto má víc koní než celý Raškovice.“ / „Pomůžu ti. Ale řeknu to všem.“
- **Obchod:** Je to zároveň dealer u obecního úřadu: pod pultem prodává zbraně, vestu a lékárničky (dřív „Veseta“, ADR-009). Přes den v obchodě, večer v eRku.

### Omyx
- **Kdo:** Střelený zhulený dealer trávy, hlasitý, občas se popere.
- **Výhoda:** Prodává trávu (když za ním dojdeš) a poradí, jak na koho jít.
- **Nevýhoda:** Po rozhovoru s ním hráčova postava pořád mele, že chce hulit a chce za Omyxem.
- **Kde:** Přes den u řeky (prodává trávu), večer v eRku u stolu nejblíž dveřím (ADR-010). V Aktu 1 sedí v hospodě.
- **Mise (Akt 1):** *Beskydský čaj.* Tři gramy se slevou za 450 Kč, prodat Omladině aspoň za 200 Kč za gram. Čaj v ruce (6 nebo Q), „útok“ na člena Omladiny otevře handlování (ADR-019).
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
- **Kde:** U štamgastského stolu (s plakátem), směje se všemu, i když tomu nerozumí.
- **Mise (Akt 1):** *Zjebal domů.* Odvézt ho autem k Ajině v časovém limitu; u domu výslech: pravda, lež, nebo mlčení (pak honička s pálkou, ADR-021). Po misi dá hráči klíčky od traktoru.
- **Plotková:** „Zjebal. Hodnej, dokud nezačne mluvit o politice. Naštěstí v deset musí domů, žena mu jinak zamkne.“
- **Hlášky:** „Hehe, dobrý, dobrý!“ / „Náklaďák? Dám ti ho zaparkovat i do kurníku.“ / „Ještě jedno a jdu. Ne, fakt. Žena.“
- **Pozor:** Žádné symboly, pozdravy ani nenávistné hlášky. Vtip je na jeho účet, ne na účet jiných (ADR-007).

### Vysoký Denny (Dan)
- **Kdo:** Tichý přátelský mechanik, majitel Autoúprav Dan (Dan = Denny, stejná postava). Umí zmizet auto. I člověka.
- **Výhoda:** Přebarví a opraví auto, vykoupí auto. Dřívější garáž je teď rozhovor s ním (3 volby).
- **Nevýhoda:** Moc neporadí.
- **Kde:** Mezi 13:00 a 17:00 v eRku (u zdi u kulečníku, opřený, mlčí), jinak stojí před svou garáží.
- **Plotková:** „Vysoký Denny. Spraví ti auto, přelakuje, a kdyby bylo potřeba, tak i zmizí. Na co se ho zeptáš, odpoví ‚hm‘.“
- **Hlášky:** „Hm.“ / „Dovez ho. Udělám.“ / „Co auto? Jaký auto?“
- **Mise (Akt 1):** *Auto pro Dennyho.* Ukrást nepolicejní auto a dovézt ho do dílny aspoň na 90 % a bez hvězd; auto samo vjede do garáže. 600 Kč (ADR-022).

### Denny sochař
- **Kdo:** Chudý, pořád něco chce, pořád si stěžuje.
- **Výhoda:** Jde se ho zbavit: musí dostat pár ran pěstí, pak odejde pryč.
- **Nevýhoda:** Pořád si chce půjčit peníze (volba ano / ne).
- **Kde:** U konce baru, nad prázdnou sklenicí.
- **Plotková:** „Denny sochař. Sochá hlavně dluhy. Nepůjčuj mu, nebo mu půjč a zapomeň na to.“
- **Hlášky:** „Nemáš stovku? Vrátím. Fakt. Asi.“ / „Umění se v Beskydech nenosí.“ / „Mám rozdělanou sochu Lysé hory. Zatím je to kámen.“
- **Mise (Akt 1):** *Lešení.* Traktorem s vlečkou od eRka ke kostelu, naložit lešení, odvézt na starou pilu (jeho „ateliér“). Jde až po misi se Zjebalem. 250 Kč z farářových peněz (ADR-023).

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

### Slečna Kobyla
- **Kdo:** Místní na zastávce před eRkem, s ohonem jako kobyla. Vidí všechno, komentuje všechno. Na „paní“ je háklivá.
- **Role:** První postava, kterou hráč potká po vystoupení z autobusu. Sarkasticky ho pošle do hospody.
- **Hlášky:** „Vypadáš žíznivě. Nejbližší hospoda je eRko. Nejvzdálenější taky, jiná tu není.“ / „S takovým čírem tě do kostela nepustí. Do eRka jo, tam pustí i prase.“

### Ajina
- **Kdo:** Zjebalova žena. Růžový župan, natáčky, u dveří baseballka „na zloděje a na Zjebala“.
- **Kde:** Doma na jihovýchodě u řeky. Vyletí ze dveří, když hráč přiveze Zjebala.
- **Role:** Výslech po misi *Zjebal domů*: pravdu ocení stovkou na benzín, lež odmění bačkorou, a kdo mlčí, toho minutu honí s pálkou po vesnici (ADR-021).
- **Hlášky:** „Z práce od Vesty je to domů pět minut. Pěšky. Po čtyřech deset.“ / „Mlčíš? TAK MLČÍŠ?!“ / „Domů se chodí v deset, ne v jedenáct!“

### Kupci z Omladiny (mise Omyxe)
Všichni plnoletí (ADR-018). Pět typů, každý má slabinu (argument, který zabere) a co ho naštve:
- **Ondra s ring lightem** (influencer): zabere status a Insta, naštve diskrétnost.
- **Tadeáš, co byl v Amsterdamu** (znalec): zabere původ, naštve status.
- **Kuba Drobák** (skrblík, platí v drobných): zabere vzácnost, naštve účinek; někdy na dvě stovky nemá.
- **Šimon VPN** (paranoik): zabere diskrétnost, naštve Insta.
- **Bára Vibe**: zabere účinek, naštve původ („tam se koupe Metějka“).

### Zmínění, zatím bez role
- **Lakatoš** (Hasiči ho pořád hledají, nechává hadice v eRku), **pan Franta** (rozhlas: odjel autem z hospody).
