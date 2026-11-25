import type { GroupId } from '../systems/respect';
import type { AreaId } from '../world/areas';

export type Tier = 'green' | 'yellow' | 'red';

export type MissionType =
  | 'stealVehicle'
  | 'transportPerson'
  | 'killBoss'
  | 'destroyVehicle'
  | 'deliverPackage'
  | 'robConvoy'
  | 'sabotage'
  | 'stealCargo'
  | 'protectMember'
  | 'evadePolice'
  | 'surviveAttack';

export interface MissionInfo {
  id: string;
  area: AreaId;
  group: GroupId;
  tier: Tier;
  type: MissionType;
  title: string;
  brief: string;
}

/**
 * Všechny zakázky první oblasti. Každá skupina má aspoň jednu zelenou,
 * celkem pokrývají všech 11 typů misí z plánu.
 */
export const MISSIONS: MissionInfo[] = [
  // Dřevaři
  {
    area: 'moravka', id: 'drevari-pila', group: 'drevari', tier: 'green', type: 'deliverPackage',
    title: 'Pila ze servisu',
    brief: 'Vyzvedni naši motorovou pilu u obchodu a dones ji na pilu. Bez ní tu jen sedíme a pijeme.',
  },
  {
    area: 'moravka', id: 'drevari-pepa', group: 'drevari', tier: 'yellow', type: 'killBoss',
    title: 'Zelený Pepa',
    brief: 'Zelený Pepa, jedinej chlap v kroužku Biomatek, nám přivázal dělníka ke smrku. Najdi ho u hráze a vyřeš to.',
  },
  {
    area: 'moravka', id: 'drevari-franta', group: 'drevari', tier: 'yellow', type: 'protectMember',
    title: 'Franta jde domů',
    brief: 'Franta je v hospodě sťatej a musí na pilu. Biomatky na něj číhají s chia semínky. Doprovoď ho.',
  },
  {
    area: 'moravka', id: 'drevari-tabor', group: 'drevari', tier: 'red', type: 'sabotage',
    title: 'Protestní tábor',
    brief: 'Biomatky si postavily tábor v lese a nedají nám kácet. Polož k nim nálož a zmiz.',
  },
  // Štamgasti
  {
    area: 'moravka', id: 'stamgasti-jarda', group: 'stamgasti', tier: 'green', type: 'transportPerson',
    title: 'Jarda domů',
    brief: 'Jarda zase usnul pod stolem. Hoď ho autem domů, než se probudí a začne zpívat.',
  },
  {
    area: 'moravka', id: 'stamgasti-pivo', group: 'stamgasti', tier: 'yellow', type: 'stealCargo',
    title: 'Pivní krize',
    brief: 'Hospodě došlo pivo a dodávka s ním stojí u obchodu. Přivez ji. Zaplatíme… možná.',
  },
  {
    area: 'moravka', id: 'stamgasti-konvoj', group: 'stamgasti', tier: 'red', type: 'robConvoy',
    title: 'Konkurenční pivovar',
    brief: 'Dvě dodávky konkurenčního pivovaru jedou přes Morávku. Ať nedojedou. Nikam.',
  },
  // Biomatky
  {
    area: 'moravka', id: 'ekologove-traktor', group: 'ekologove', tier: 'green', type: 'destroyVehicle',
    title: 'Smrdutý traktor',
    brief: 'Dřevaři mají u pily traktor, co kouří víc než celá hospoda. Znič ho.',
  },
  {
    area: 'moravka', id: 'ekologove-pila', group: 'ekologove', tier: 'yellow', type: 'sabotage',
    title: 'Ticho na pile',
    brief: 'Na pile řežou dnem i nocí. Polož nálož k jejich katru a uteč. Za stromy!',
  },
  {
    area: 'moravka', id: 'ekologove-kazimir', group: 'ekologove', tier: 'red', type: 'killBoss',
    title: 'Mistr Kazimír',
    brief: 'Mistr pily Kazimír pokácel posvátný buk. Je na pile se svými chlapy. Ať je to poslední buk.',
  },
  // Omladina
  {
    area: 'moravka', id: 'skola-auto', group: 'skola', tier: 'green', type: 'stealVehicle',
    title: 'Auto pro třídu',
    brief: 'Potřebujeme auto na výlet. Před hospodou stojí jedno, Štamgasti stejně neřídí. Přivez ho na hřiště.',
  },
  {
    area: 'moravka', id: 'skola-honicka', group: 'skola', tier: 'yellow', type: 'evadePolice',
    title: 'Zkouška odvahy',
    brief: 'Kluci tvrdí, že fízlům neutečeš. Dokaž jim opak. Zavolali jsme je za tebe.',
  },
  {
    area: 'moravka', id: 'skola-utok', group: 'skola', tier: 'red', type: 'surviveAttack',
    title: 'Obrana hřiště',
    brief: 'Štamgasti si přišli pro pomstu za ukradené pivo. Pomoz nám ubránit hřiště!',
  },

  // ---------- Raškovice: Voraři, Rybáři, Chalupáři, Učňáci ----------
  {
    area: 'raskovice', id: 'r-vorari-terenak', group: 'drevari', tier: 'green', type: 'destroyVehicle',
    title: 'Hluk u jezu',
    brief: 'Chalupáři nám u jezu parkujou teréňák, ať prý vory nejezdí. Ať tam už nic neparkuje.',
  },
  {
    area: 'raskovice', id: 'r-vorari-konvoj', group: 'drevari', tier: 'red', type: 'robConvoy',
    title: 'Konkurenční pila',
    brief: 'Dvě dodávky s prknama z cizí pily jedou přes vesnici. My jsme tu pila. Ať nedojedou.',
  },
  {
    area: 'raskovice', id: 'r-rybari-pruty', group: 'stamgasti', tier: 'green', type: 'deliverPackage',
    title: 'Ukradené pruty',
    brief: 'Někdo nám šlohnul pruty a nechal je u obchodu. Přines je do hospody U Kapra.',
  },
  {
    area: 'raskovice', id: 'r-rybari-lojza', group: 'stamgasti', tier: 'yellow', type: 'transportPerson',
    title: 'Kapr pro starostu',
    brief: 'Lojza veze starostovi kapra. Je trochu… unavenej. Odvez ho na obecní úřad.',
  },
  {
    area: 'raskovice', id: 'r-chalupari-skutr', group: 'ekologove', tier: 'green', type: 'destroyVehicle',
    title: 'Ticho, prosím',
    brief: 'Učňáci jezdí na skútru kolem chalup od rána do noci. Ať ten skútr zmlkne.',
  },
  {
    area: 'raskovice', id: 'r-chalupari-zdenek', group: 'ekologove', tier: 'yellow', type: 'killBoss',
    title: 'Mistr odborného výcviku',
    brief: 'Mistr Zdeněk učí učně driftovat po návsi. Najdi ho u učiliště a ukonči výuku.',
  },
  {
    area: 'raskovice', id: 'r-ucnaci-dodavka', group: 'skola', tier: 'green', type: 'stealVehicle',
    title: 'Praxe v autodílně',
    brief: 'Na praxi potřebujeme dodávku. U obchodu stojí jedna. Přivez ji k učilišti.',
  },
  {
    area: 'raskovice', id: 'r-ucnaci-honicka', group: 'skola', tier: 'yellow', type: 'evadePolice',
    title: 'Závod s fízly',
    brief: 'Kdo setřese dvě hvězdy, dostane výuční list. Zavolali jsme jim, ať se snaží.',
  },
  {
    area: 'raskovice', id: 'r-ucnaci-obrana', group: 'skola', tier: 'red', type: 'surviveAttack',
    title: 'Obrana dílen',
    brief: 'Rybáři jdou vrátit, co jsme jim vzali. Pomoz nám udržet učiliště!',
  },
];

export const TIER_NAMES: Record<Tier, string> = { green: 'Zelená', yellow: 'Žlutá', red: 'Červená' };
