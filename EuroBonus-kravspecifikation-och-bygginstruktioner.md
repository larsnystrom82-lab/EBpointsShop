# EuroBonus-jämförelse – kravspecifikation och instruktioner till AI-kodaren

Version 1.0 · 2 oktober 2026 · Svenska · MVP för responsiv webb

## 1. Syfte och beslutsstatus

Bygg en tjänst som hjälper användaren att jämföra EuroBonus-intjäning mellan butiker och köpvägar för ett belopp som användaren själv anger. Visa alla relevanta alternativ och låt användaren välja efter bonuspoäng, nivåpoäng, kostnad och antal steg. Tjänsten ska aktivt hitta möjliga kedjor via presentkort och Zupergift.

Detta dokument omsätter den genomförda intervjun till krav, acceptanskriterier och bygginstruktioner. **Ska** anger MVP-krav. **Föreslagen standard** anger ett konkret genomförandeval som kan ändras utan att ändra produktens huvudkrav. Framtida funktioner står i separat backlog.

Underlag: användarens intervjusvar samt presentationen ”Smeg kolsyremaskin exempel.pptx”. Användaren har valt den första tidigare visade designbilden, särskilt för att den använder butikernas loggor. Bildfilen finns inte tillgänglig i detta underlag. Därför är loggorna bekräftad designriktning; färger, typsnitt och layout nedan är föreslagna standarder. Om bilden blir tillgänglig för kodverktyget ska den användas som visuell referens inom dessa funktionella krav.

## 2. MVP och avgränsningar

| Ingår från start | Ingår senare eller inte i denna produkt |
|---|---|
| Svenskspråkig responsiv webb för mobil och dator | Separata iOS- och Android-appar |
| Butikssökning, alfabetisk lista och manuella kategorier | Produktsökmotor och automatisk produktprisjämförelse |
| Manuellt val av flera butiker och ett angivet köpbelopp | Produktbevakning |
| SAS Online Shopping, SAS EuroBonus Shop/presentkort och Zupergift | Butiksbaserade kampanjnotiser: version 2 |
| Direktköp, presentkort och indirekta presentkortskedjor | Historik och diagram över poängnivåer |
| Bonuspoäng, nivåpoäng och kortintjäning separat | Automatisk kontroll av vilka kort butiker accepterar |
| Flera valda kort, jämförda inom samma köpväg | Användarkonton och personliga profiler |
| Filter för presentkort och Zupergift; sortering | Detaljerad sökning på produktnamn och produkttyper |
| Daglig automatisk datainsamling med manuella korrigeringar | Automatisk fullständig tolkning av alla specialvillkor |
| Skyddad admin, felrapportering och grundläggande statistik | Betalning eller köp inne i appen |
| Lokal lagring av filter och kortval | Ekonomisk värdering av poäng i kronor |

Den tidigare ambitionen om historiska kampanjjämförelser ersätts av senare beslut: ingen användarsynlig poänghistorik. Märk bara ett erbjudande som kampanj när SAS uttryckligen gör det. Tekniska ändringsloggar för administration är tillåtna och behövs för spårbarhet.

**Föreslagen marknadsstandard:** Sverige, SEK och svenska kortvarianter i MVP. Landväljare byggs inte nu. Visa marknaden tydligt och håll den som konfiguration.

## 3. Användarflöden

### 3.1 Jämföra butiker

1. Användaren söker butik, bläddrar alfabetiskt eller väljer kategori.
2. Användaren markerar en eller flera butiker. Visa valen som tydliga, borttagbara etiketter.
3. Användaren anger köpbelopp, exempelvis 1 995 kr. Beloppet gäller samma tänkta köp i samtliga valda butiker.
4. Användaren väljer kort och filter.
5. Appen visar giltiga köpvägar med beräknad intjäning och kostnad.
6. Användaren ändrar sortering eller öppnar instruktionerna för en väg.
7. Användaren går via länken till första relevanta sida och genomför köpet utanför appen.

Beloppet kommer från användaren. Appen ska varken leta upp produkter eller påstå att butikerna säljer samma produkt till det beloppet. Skriv exempelvis ”Jämförelse för ditt angivna köpbelopp”.

### 3.2 Kontrollera en butik utan köpbelopp

Visa om butiken kan nås genom partnerköp, presentkort eller Zupergift, tillgängliga poängregler, kampanjmarkering och tidpunkt för senaste kontroll. Begär belopp för att beräkna totalpoäng och pröva 10-kronorsgränsen. Ett okänt belopp ska aldrig ersättas med ett dolt standardbelopp.

### 3.3 Rapportera fel

En användare kan rapportera fel från ett resultat eller en butik. Rapporten kopplas automatiskt till butik, köpväg, dataversion och relevant regel. Fritext beskriver felet. Rapporten sparas i admin med status Ny, Under granskning eller Åtgärdad. Konto krävs inte. Kontaktuppgift krävs inte i MVP.

## 4. Funktionella krav

| ID | Krav |
|---|---|
| F01 | Sökning ska hitta butiker via standardnamn och alias, utan skillnad på stora och små bokstäver. |
| F02 | Visa alfabetisk lista samt manuellt administrerade kategorier. En butik kan ha flera kategorier. |
| F03 | Användaren ska kunna jämföra flera manuellt valda butiker. Ingen butik får väljas automatiskt utan att det framgår. |
| F04 | Köpbelopp ska valideras som ett positivt SEK-belopp med högst två decimaler. Stöd svensk inmatning med decimaltecken och tusentalsmellanrum. |
| F05 | Appen ska hitta alla relevanta stödjade köpvägar till varje vald butik, inklusive indirekta Zupergift-kedjor. |
| F06 | Presentkort och Zupergift ska ha separata filter. Avstängda presentkort döljer även Zupergift-vägar som kräver presentkort. |
| F07 | Flera kort ska kunna väljas samtidigt. ”Inget EuroBonus-kort” är ömsesidigt uteslutande med kortval. |
| F08 | Kortalternativ ska visas inom samma köpväg, med total, kortpoäng och eventuella kortrelaterade nivåpoäng separat. |
| F09 | Visa bonuspoäng och nivåpoäng som två skilda mått. De får aldrig summeras till ett gemensamt poängtal. |
| F10 | Sortera på flest bonuspoäng, flest nivåpoäng, lägst totalt utlägg, minst antal steg och bonuspoäng per utlagd krona. |
| F11 | Valet ”Nivåpoäng är viktiga” ska påverka standardordningen. Föreslagen standard: nivåpoäng först, därefter bonuspoäng. Ingen dold viktad poängformel. |
| F12 | Visa poäng per källa, köpbelopp, utlägg, presentkortsvärde, kvarvarande saldo, extra utlägg och antal steg. |
| F13 | Varje köpväg ska ha stegvis instruktion och länk till första relevanta ingångssida. |
| F14 | Visa senaste lyckade kontroll av erbjudanden. En misslyckad hämtning får inte flytta fram kontrolltiden. |
| F15 | Märk kampanj endast utifrån uttrycklig SAS-markering och eventuell angiven giltighetstid. |
| F16 | Visa generell villkorsinformation samt specifik varning vid osäkra detaljer. |
| F17 | Köpvägar som kräver mer än 10 kr extra utlägg ska inte visas som valbara beräknade alternativ. |
| F18 | Spara kortval, filter och sorteringspreferens lokalt om webbläsaren tillåter det. Funktionen ska fungera även när lokal lagring nekas. |
| F19 | Publik app ska sakna inloggning och länkar till admin. |
| F20 | Admin ska kunna korrigera data, administrera butiker och regler, hantera felrapporter och se sammanställd användning. |

**Sorteringsstandard:** flest bonuspoäng när nivåpoäng inte prioriteras. Vid flera valda kort används det högsta beräknade utfallet för aktuell sortering, tydligt märkt med kortets namn och ”förutsätter att kortet accepteras”. Visa även övriga valda kort i samma resultat. Vid lika resultat: lägre utlägg, färre steg, butiksnamn. Användaren kan alltid byta sortering.

”Lägst pris” från intervjun implementeras som **lägst totalt utlägg**, eftersom appen inte känner till produktpriser hos olika butiker. Ange inte att en butik har billigare produkter.

## 5. Beräkningsmotor – centrala regler

### 5.1 Pengar och poäng

Använd heltal i ören för pengar eller en decimaltyp med exakt precision. Använd aldrig binär flyttalsaritmetik för 10-kronorsgränsen. Håll beräkningsmotor fristående från gränssnitt och datainsamlare.

Varje poängregel ska ange beräkningsgrund, exempelvis kvalificerande betalningsbelopp, poäng per 100 kr, fast bonus per presentkort eller annan uttrycklig regel. Lagra avrundningsmodell och var avrundningen görs: per transaktion, per artikel eller på summerad bas. Härled inte aktuell avrundning från ett exempel i presentationen.

En okänd poängregel ger **”Kan inte beräknas”**, aldrig 0 poäng och aldrig ett påhittat exakt resultat. Kända delar kan visas som delresultat, men köpvägen får inte rankas som om totalen vore komplett.

### 5.2 Utgifter och 10-kronorsgränsen

Låt B vara användarens köpbelopp. Låt U vara summan av faktiska nya betalningar som behövs för vägen: köp av första presentkort, eventuell mellanskillnad hos butiken och kända obligatoriska avgifter. Inlösen av redan betalt presentkort är ingen ny utgift.

`extra_utlägg = max(0, U − B)`

En fullt beräknad köpväg är valbar endast om `extra_utlägg ≤ 1 000 öre`. Kvarvarande presentkortssaldo får inte användas som avdrag från U för att kringgå gränsen. Visa det separat som bundet saldo. Utgå från att användaren inte redan har presentkort; befintliga saldon ingår inte i MVP.

Gränsen gäller merkostnaden för köpvägen, inte skillnaden mot ett produktpris som appen har hittat på. Leverans eller andra kostnader som ligger utanför det angivna beloppet och är okända ska inte beräknas som 0. Visa vad underlaget omfattar.

Om obligatorisk avgift eller finansiering är okänd kan vägen visas som information med varning, men inte som ett exakt rankat alternativ som påstås klara gränsen.

### 5.3 Presentkort och kedjor

Stöd både fasta valörer och fritt belopp inom dokumenterade gränser. Stöd högsta antal kort, köpgränser, växlingsförhållande, avgifter och kända regler för kombination och delbetalning. Dessa egenskaper ska vara data, inte kod knuten till ett butiksnamn.

Enumerera tillåtna kombinationer av presentkort inom regelgränserna. Beräkna täckning, eventuell mellanskillnad, restsaldo och faktisk poängintjäning för varje kombination. Slå ihop identiska utfall för samma väg och kort, men behåll upplägg som skiljer sig i poäng, utlägg eller genomförande. Optimera inte enbart efter lägsta presentkortssumma om en annan tillåten kombination ger fler poäng.

Delbetalning får bara ligga till grund för en exakt plan om den stöds av registrerad regel. Om det är osäkert: visa osäkerheten, beräkna inte en garanterad finansieringsplan. Samma princip gäller möjligheten att kombinera flera presentkort.

Zupergift-vägar ska härledas från registrerade kopplingar, exempelvis SAS → Zupergift → Cervera-presentkort → Cervera. Kontrollera valörer och avgifter på varje led. Anta inte att varje växling ger ytterligare EuroBonus-poäng.

Representera vägar som en riktad graf och förhindra cykler. MVP ska täcka direkt partnerköp, butikspresentkort och en Zupergift-växling till butikspresentkort. Längre kedjor får stödjas senare. Sätt en teknisk gräns för antal kombinationer och returnera ett tydligt fel om den nås; kapa inte beräkningen tyst.

### 5.4 Ingen dubbelräkning

- Tilldela poäng bara till händelser där en registrerad regel faktiskt ger poäng.
- Kortpoäng räknas på betalningen för presentkortet och på eventuell ny kontant mellanskillnad, om respektive regel medger det.
- Kortpoäng räknas inte igen på det belopp som betalas genom inlösen av presentkort.
- Partnerpoäng ovanpå presentkortsinlösen får bara räknas om registrerade villkor stödjer kombinationen. Utan stöd visas delarna som alternativa vägar, inte som staplad bonus.
- Bonuspoäng och nivåpoäng ska beräknas och redovisas var för sig, även när de uppstår vid samma händelse.
- Användarens valda kort är alternativ till varandra. Poäng från två kort får inte summeras som om båda betalar hela köpet.

**Föreslagen MVP-standard:** ett och samma valt kort används för alla nya kortbetalningar inom en väg. Jämför vägen separat med varje valt kort. Blandning av olika kort mellan leden ingår inte nu.

### 5.5 Kortregler och kortacceptans

Ha konfigurerbara poster för SAS Amex Classic, Premium och Elite samt SAS EuroBonus Mastercard och Mastercard Premium. Kortnamn och aktuella intjäningsvillkor måste verifieras vid implementation; presentationen är inte källa för dessa regler.

Stöd regelbaserad bonusintjäning och direkt köpanknuten nivåintjäning när den kan beräknas från tillgängliga uppgifter. Anta inte årsomsättning, uppnådda trösklar, användarstatus eller kvarvarande tak. Om ett kort kräver sådan information ska kortdelen märkas som villkorad eller ej beräkningsbar. Visa inga garanterade tröskelbonusar.

MVP kontrollerar inte kortacceptans hos butiker eller presentkortsleverantörer. Visa ”Kortpoängen förutsätter att kortet accepteras i betalningsledet och att köpet ger poäng enligt kortets villkor.” Ranka utfallet som en beräkning med denna förutsättning, inte som ett löfte om betalningsmöjlighet.

### 5.6 Antal steg och poäng per krona

Ett steg är en handling användaren måste göra: öppna partneringång, köpa presentkort, växla presentkort eller genomföra butiksköp. Visa antalet steg från den faktiska instruktionen. Antalet får inte hårdkodas till en vägtyp eller bara baseras på antal grafnoder.

Poäng per krona = beräknade bonuspoäng / U. Nivåpoäng visas separat. Om U eller total bonus är okänd visas inte kvoten. Använd exempelvis två decimaler för visning, men sortera på full beräknad precision.

## 6. Design och gränssnitt

### 6.1 Grafisk riktning

Butikernas riktiga loggor ska göra listor och resultat lätta att känna igen. Visa alltid butiksnamn även när logga finns. Använd godkända eller tillåtna logofiler med bibehållna proportioner och fria marginaler. Om fil saknas används en neutral platshållare och namn; AI ska inte generera ersättningsloggor som ser officiella ut.

Föreslagen standard: ljus neutral bakgrund, vita resultatkort, mörk marinblå text, blå primärknappar och diskret grön markering för kampanj. Använd systemtypsnitt för snabb laddning. Rundade kort, tydlig luft och stor läsbar poängsiffra. Färg ska alltid kompletteras med text eller symbol. Appen ska ha egen identitet och får inte utformas som om den vore SAS officiella tjänst.

Skapa designvariabler för färger, typografi, avstånd, radier och skuggor. Exakta färgkoder är implementationens förslag, inte beslut från den osedda referensbilden.

### 6.2 Startsida

Rubrik: ”Jämför EuroBonus-poäng för ditt köp”. Kort förklaring: ”Välj butiker och köpbelopp. Se poäng via partnerköp, presentkort och dina kort.”

Ordning: butikssökning → valda butiker → köpbelopp → filter → ”Jämför alternativ”. Alfabetisk lista och kategorier nås enkelt från butiksväljaren. Visa presentkort, Zupergift, nivåpoängsprioritet och kortval tydligt. Föreslagen standard: presentkort och Zupergift påslagna, inga kort förvalda.

På mobil används en kolumn och en filterpanel som kan öppnas utan att val tappas. På dator kan filtren ligga i sidokolumn. Formuläret ska ha riktiga etiketter, tangentbordsstöd och begripliga felmeddelanden. Ingen horisontell scroll ska krävas vid 360 px bredd.

### 6.3 Resultatkort

Visa i denna ordning:

1. Butikslogga, butiksnamn och vägtyp.
2. Total **bonuspoäng**, samt separat **nivåpoäng**.
3. Tydlig uppdelning: partner/presentkort/kort och eventuella övriga verifierade källor. Ingen generell ”annan bonus” utan namngiven regel.
4. Köpbelopp, totalt utlägg, presentkortens värde och extra utlägg. Visa restsaldo när det finns.
5. Samtliga valda kort som jämförbara rader inom kortet. Visa även utfallet utan kortbonus som referens.
6. Köpväg och antal steg; kampanjmärkning när tillämpligt.
7. Senaste kontroll samt specifika osäkerheter.
8. ”Visa instruktion”, länk till första sida och ”Rapportera fel”.

Om köpvägen använder flera datakällor ska användaren kunna se kontrolltid för respektive källa. En sammanfattande kontrolltid ska vara den äldsta relevanta lyckade kontrollen, inte den senaste för något enstaka led.

Visa belopp på svenska, exempelvis ”1 995 kr”, och tid i Europe/Stockholm. Visa explicita tillstånd för laddning, inga träffar, inga köpvägar inom gränsen, ogiltigt belopp och datakälla som inte kunnat uppdateras.

### 6.4 Villkorstext

Visa nära resultat och instruktion:

> EuroBonus-erbjudanden, poängnivåer och villkor kan ändras. Kontrollera alltid aktuella villkor och följ instruktionerna från SAS EuroBonus och respektive butik innan köp.

Osäkra detaljer ska dessutom namnges på den berörda vägen. Generell friskrivning ersätter inte information om en konkret osäkerhet och får inte användas för att motivera påhittade beräkningar.

## 7. Datainsamling och kvalitet

Bygg separata adaptrar för SAS Online Shopping, SAS EuroBonus Shop och Zupergift. De ska samla poängregler, butiksrelationer, valörer, uttrycklig kampanjmarkering, instruktioner, relevanta villkor och källhänvisningar där informationen är tillgänglig.

Presentationens ingångar är referenser som ska verifieras före anslutning:

- https://onlineshopping.flysas.com/
- https://www.saseurobonusshop.com/se/gift-cards-vouchers
- https://zupergift.com/se/alla-presentkort

Dokumentet gör inga påståenden om att dessa adresser eller erbjudanden är aktuella idag. Använd officiella tillgängliga gränssnitt eller tillåten hämtning. Kartlägg faktisk åtkomst innan produktionsintegration. Om automatisk insamling inte går för en källa ska begränsningen redovisas och manuell administration fungera; detta uppfyller inte ensamt kravet på huvudsakligen automatisk insamling.

Kör uppdatering en gång per dygn, föreslagen tid 04:00 Europe/Stockholm. Tillåt manuell omkörning per källa i admin. Håll senaste hämtningsförsök, senaste lyckade kontroll och erbjudandets giltighetstid som skilda fält.

Validera hämtningen i ett mellanlager innan publicering. Ofullständig hämtning får inte radera stora mängder butiker eller skriva över god data med tomma värden. Bevara senast kända data vid fel och märk den som äldre. Föreslagen varningsgräns: mer än 48 timmar sedan lyckad kontroll. Känd passerad giltighetstid inaktiverar erbjudandet även om senaste hämtning misslyckats.

Lagra källans råvärde och den normaliserade regeln med spårbarhet. Automatisk normalisering av okända butiksnamn ska skapa ett granskningsärende vid osäker matchning. Manuellt standardnamn, alias och stabilt butiks-ID ska styra sammanföringen.

Adminöverstyrningar ska lagras separat från importerade värden och ha företräde tills admin tar bort dem eller vald sluttid passerar. Nästa automatiska uppdatering får inte skriva bort en aktiv korrigering. Visa konflikt mellan ny källdata och aktiv överstyrning i admin.

## 8. Datamodell

| Objekt | Centrala fält och ansvar |
|---|---|
| Store | id, standardnamn, alias, slug, logga, kategorier, aktiv |
| Category | id, svenskt namn, ordning, aktiv |
| Source | id, typ, källadress, adapter, senaste försök, senaste framgång, status |
| Offer | id, butik/mål, källa, regelreferenser, uttrycklig kampanjstatus, giltighet, kontrolltid, aktiv |
| GiftCardProduct | leverantör, målbutik/växlingsprogram, valörer eller beloppsintervall, max antal, avgifter, kombinations- och delbetalningsregler |
| RouteEdge | från, till, handling, erbjudande, växlingsrelation, förutsättningar, första relevanta ingångslänk |
| PointRule | poängtyp, beräkningsgrund, rate/fast bonus, avrundning, kvalificeringsvillkor, tak, källa |
| PaymentCard | namn, nätverk, marknad, aktuella regelreferenser, giltighet |
| AdminOverride | objekt, fält, korrigerat värde, skäl, skapare, start/slut, aktiv |
| ErrorReport | butik/väg/regel/dataversion, fritext, status, tid, adminanteckning |
| ImportRun | källa, start/slut, status, antal poster, valideringsfel, publicerad dataversion |
| AuditEvent | admin, åtgärd, objekt, före/efter, tid |
| UsageAggregate | datum, tillåten händelsetyp, butik/kategori/filterkod, antal |

En beräknad RouteResult ska innehålla instruktioner, betalningshändelser, poängkomponenter per källa och kort, utlägg, restsaldo, kontrolltider och osäkerheter. Det ska gå att förklara varje siffra från underlaget. Sparade köpberäkningar per person behövs inte.

## 9. Admin, säkerhet och statistik

Admin ska ha separat adress och serververifierad autentisering och behörighet. Adressen ska inte länkas från den publika sidan. Att länken saknas är ingen säkerhetsmekanism: alla admin-API:er ska skyddas även vid direkt anrop. Använd etablerad autentisering och skapa inte en publik adminregistrering.

Admin ska kunna administrera butik, alias, logga, kategori, kopplingar, valörer, regler, villkorsnoteringar, kampanjstatus och aktivering. Korrigering ska kräva skäl och visa om det är en överstyrning. Visa importstatus och förhandsgranska effekten av ändringar i beräkning innan publicering. Admin ska kunna inaktivera en felaktig väg utan att ta bort butiken.

Statistik ska visa vanligaste valda/sökta butiker, kategorier, antal jämförelser, filteranvändning och vanligaste butikskombinationer. Föreslagen standard är sammanställda räknare utan användar-ID och utan lagring av rå fritext, köpbelopp eller kortuppgifter. Kortval är endast korttyp; appen ska aldrig fråga efter kortnummer, EuroBonus-nummer eller betalningsuppgifter. Föreslagen lagringstid för statistik: 90 dagar. Felrapporter lagras tills de hanterats och därefter enligt konfigurerad gallring.

Validera indata på server, begränsa längd och frekvens på felrapporter och rendera fritext säkert. Hemligheter ska hållas på server. Publika API-svar får inte innehålla adminuppgifter, hemligheter eller intern fritext.

## 10. Teknik och genomförande

Teknikstacken är inte ett användarbeslut. Föreslagen arkitektur: TypeScript, ett etablerat ramverk för responsiv webb, relationsdatabas, server-API, schemalagt insamlingsjobb och etablerad adminautentisering. Välj en stack som kodverktyget och vald driftmiljö stödjer. Lås inte implementationen till en version utan att kontrollera aktuell officiell dokumentation.

Moduler: publikt gränssnitt, ren beräkningsmotor, graf för köpvägar, normaliserad datalagring, källadaptrar, adminöverstyrningar, admin, felrapportering och aggregerad statistik. Testdata ska vara märkt som demo och hållas åtskild från produktionsdata.

Föreslagna kvalitetsmål: tangentbordsanvändning, tydlig fokusmarkering, textkontrast minst 4,5:1 för vanlig text, tryckytor cirka 44 px, fungerande 360 px mobilvy samt desktop. På representativa MVP-data ska en jämförelse av fem butiker kännas omedelbar; mät och eftersträva svar inom en sekund från redan laddad data. Nätverkshämtning från externa källor ska inte ske i användarens beräkningsanrop.

## 11. Acceptanskriterier och testfall

Alla poängtal i tester nedan är **syntetiska testregler**, om inte presentationen uttryckligen anges. De är inte aktuella erbjudanden.

| ID | Scenario | Godkänt resultat |
|---|---|---|
| A01 | Sök ”Bagaren & Kocken” och ett registrerat domänalias | Samma stabila butik visas, utan dubbletter. |
| A02 | Välj Elgiganten och Cervera samt 1 995 kr | Båda jämförs med samma angivna belopp, utan produktprishämtning. |
| A03 | Belopp 1 995 kr; två kort à 1 000 kr; inga avgifter; kombination tillåten | Utlägg 2 000 kr, restsaldo 5 kr, extra utlägg 5 kr; vägen tillåts. |
| A04 | Belopp 1 990 kr; obligatoriskt utlägg 2 000 kr | Exakt 10 kr extra tillåts. |
| A05 | Belopp 1 989,99 kr; obligatoriskt utlägg 2 000 kr | 10,01 kr extra; vägen visas inte som valbar. |
| A06 | Belopp 1 995 kr; endast kort på 2 100 kr; full täckning krävs | 105 kr extra; vägen filtreras bort. |
| A07 | Belopp 1 995 kr; två 1 000-kort med 6 kr avgift | 11 kr extra; vägen filtreras bort. |
| A08 | Avmarkera presentkort | Alla vägar som kräver presentkort försvinner, även sådana via Zupergift. |
| A09 | Behåll presentkort, avmarkera Zupergift | Direkt butikspresentkort finns kvar, Zupergift-vägar försvinner. |
| A10 | Välj två kort | En köpväg med två kortutfall; poängen summeras inte mellan korten. |
| A11 | Presentkort köps för 2 000 kr; kortregel 10 bonus/100 kr, proportionellt | Kortbonus 200, inte ytterligare 199,5 vid inlösen för 1 995 kr. |
| A12 | Testregel: partnerbonus 20/100 kr proportionellt, avrunda ned slutresultat; nivå 5/100 kr likadant; B=1 995 kr | 399 bonuspoäng och 99 nivåpoäng, separat. |
| A13 | Samma belopp men regel om hela hundratal före multiplikation | 380 bonuspoäng; motorn respekterar regelns avrundningsmodell. |
| A14 | Zupergift kan växlas till butikskort utan egen poängregel | Ingen extra bonus uppstår enbart av växlingen. |
| A15 | Villkor för kombination eller kortbonus saknas | Den osäkra delen markeras; exakt total eller finansieringsplan uppfinns inte. |
| A16 | Nivåpoäng prioriteras | Standardordningen blir nivåpoäng först; bonuspoäng finns kvar separat. |
| A17 | SAS saknar kampanjmarkering men höjer rate | Ingen kampanjetikett skapas av appen. |
| A18 | Import misslyckas efter lyckad import | Senast kända data bevaras; kontrolltid ändras inte; admin ser felet. |
| A19 | Aktiv manuell korrigering följs av ny import | Korrigeringen gäller fortfarande och konflikten visas i admin. |
| A20 | Publik besökare anropar admin-API direkt | Ingen administrativ data eller ändringsmöjlighet lämnas ut. |
| A21 | Ladda om sidan med lokal lagring tillåten respektive blockerad | Val återställs när möjligt; appen fungerar i båda fallen. |
| A22 | Rapportera fel från en väg | Admin får rapport med rätt butik, regel och dataversion. |
| A23 | Mobil 360 px och tangentbord på desktop | Sökning, filter, kortutfall och instruktioner kan användas utan förlorade funktioner. |
| A24 | Sök butik utan belopp | Tillgängliga vägar och regler visas, men ingen påhittad totalpoäng. |
| A25 | Avgift okänd eller giltighet passerad | Ingen exakt rankad väg som påstår sig klara 10-kronorsgränsen respektive inget aktivt utgånget erbjudande. |

SMEG-presentationens exempel ska finnas som en separat märkt demonstrationsfixture: 1 995 kr, Elgiganten 202 bonuspoäng, Cervera 1 200, Bagaren och Kocken samt KitchenTime 475 bonuspoäng och 95 nivåpoäng. För Elgiganten anges två 1 000-kort och 101 poäng per kort. Övriga exempel visar utfall men inte tillräckliga aktuella regler för att återanvända dem som produktionsformler. Märk dem ”Exempel från presentation – inte aktuellt erbjudande”.

## 12. Byggordning och leveranser

1. **Grund och design:** datamodell, butiksväljare, filter och responsiva resultat med tydligt märkt demo. Leverera mobil- och desktopbilder samt beskriven stack.
2. **Beräkningsmotor:** betalningshändelser, presentkortskombinationer, köpvägar, kortutfall och sortering. Kör A03–A16 före anslutning av verkliga regler.
3. **Admin och datalager:** autentisering, alias, kategorier, regler, överstyrningar, felrapporter och auditlogg.
4. **Källadaptrar:** kartlägg alla tre källor, implementera daglig insamling, validering, felhantering och kontrolltider. Verifiera faktiska poäng- och kortregler.
5. **Sammanhängande MVP:** statistik, lokal lagring, tillgänglighet, mobiltest och acceptanstester. Dokumentera kvarvarande begränsningar.

MVP är klar när publika användarflöden fungerar, alla tre källtyper kan representeras och huvudsakligen samlas automatiskt, admin är skyddad, 10-kronorsgränsen och dubbelräkningsregler är testade och det är tydligt vilka uppgifter som är aktuella, äldre eller osäkra. En demo med hårdkodade poäng är en delmilsten, inte färdig MVP.

Leverera körbar kod, databasändringar, installations- och driftinstruktion, dokumenterade källadaptrar, tydligt märkta testdata, testresultat, beskrivning av beräkningsregler och skärmbilder från mobil och desktop. Dokumentera schemaläggning, återställning, adminåtkomst och hur nya regler läggs till.

## 13. Framtida backlog

- Butiksbevakningar och notiser när SAS uttryckligen annonserar en kampanj. Utred kanal och lagring utan att automatiskt införa full användarprofil.
- Verifierad kortacceptans per betalningsled, även hos presentkortsleverantörer.
- Mer detaljerad kategorisökning och sökord som ”kolsyremaskin”, utan att skapa produktprisjämförelse.
- Fler marknader, språk och eventuella mobilappar.
- Blandade kort mellan köpsteg och användarstyrda befintliga presentkortssaldon.

Poänghistorik och produktbevakningar är inte beslutad backlog och ska inte smygas in.

## 14. Startprompt – kopiera till vibe-kodningsverktyget

> Du ska bygga en svenskspråkig responsiv webbapp för EuroBonus-jämförelse enligt hela det bifogade dokumentet ”EuroBonus-kravspecifikation-och-bygginstruktioner.md”. Agera som erfaren produktutvecklare. Börja med att läsa dokumentet och skapa en kort implementationplan med stack, moduler, datamodell och identifierade integrationsfrågor. Fortsätt sedan till första fungerande delmilsten.
>
> Användaren väljer butiker, anger ett eget köpbelopp och markerar EuroBonus-kort. Visa alla relevanta köpvägar via SAS Online Shopping, SAS EuroBonus Shop/presentkort och Zupergift. Hitta kedjor aktivt. Jämför bonuspoäng och nivåpoäng separat och redovisa varje källa. Flera kort jämförs inom samma väg. Kontroll av kortacceptans ingår inte; visa förutsättningen tydligt.
>
> Beräkna nya faktiska betalningar. Visa aldrig en valbar beräknad väg som kräver mer än 10 kr extra utlägg. Presentkortssaldo är bundna pengar, inte ett avdrag från utlägget. Räkna inte kortpoäng två gånger vid köp och inlösen av presentkort. Stapla inte partner- och presentkortspoäng utan registrerat stöd. Varje regel ska ange beräkningsgrund och avrundning. Okänd regel eller avgift ger osäker information, inte en påhittad exakt total.
>
> Designen ska använda riktiga butiksloggor, tydliga vita resultatkort, lättlästa poängtal och ett enkelt mobilflöde. Den första designbild som användaren valt är referens om den är bifogad. Om bilden saknas, följ dokumentets föreslagna designstandard och påstå inte att du har återskapat bilden.
>
> Bygg daglig automatisk insamling med separata källadaptrar och skyddad admin för korrigeringar. Manuella överstyrningar ska överleva nästa import. Visa verklig senaste kontroll och markera kampanj endast när SAS gör det. Använd officiella källor för aktuella regler och dokumentera integrationsbegränsningar.
>
> Publika användare har inga konton. Admin kräver autentisering och behörighet på server och får inte länkas från publik sida. Lägg till felrapportering, lokal lagring av filter och sammanställd statistik. Bygg ingen produktsökning, prishämtning, poänghistorik, notisfunktion eller native-app i MVP.
>
> Börja med tydligt märkta syntetiska data för UI och motor. Byt därefter till verifierade integrationsdata. Rapportera vid varje delmilsten vad som fungerar, vilka acceptanskriterier som testats och kvarvarande begränsningar. Stanna inte vid en plan eller mockup. Implementera och verifiera stegvis. Om liveintegration blockeras, färdigställ oberoende delar och dokumentera blockeraren utan att kalla demon produktionsklar.

## 15. Uppföljningsprompter

### Efter första gränssnittet

> Granska mobil- och desktopvyn mot kapitel 6. Säkerställ riktiga eller neutrala logoplatshållare, tydliga poängkällor, kortutfall inom samma väg och inga produktprisuppgifter. Visa skärmbilder. Rätta upptäckta problem innan nästa delmilsten.

### Före liveintegration

> Verifiera beräkningsmotorn mot A03–A16. Förklara varje betalningshändelse och poängkomponent för direktköp, butikspresentkort och Zupergift-väg. Testa 10,00/10,01 kr, avgifter, avrundning och dubbelräkning. Fortsätt först när resultaten stämmer.

### Före slutleverans

> Kör acceptanskriterierna i kapitel 11 och redovisa godkända, underkända och blockerade kriterier. Kontrollera serverbehörighet för admin, importfel, bestående överstyrningar, datatider, svensk mobilvy och att demo inte presenteras som live. Rätta fel, dokumentera återstående integrationsbegränsningar och leverera driftinstruktioner samt skärmbilder.
