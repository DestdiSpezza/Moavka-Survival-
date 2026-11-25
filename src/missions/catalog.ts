import type { GroupId } from '../systems/respect';

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
    id: 'drevari-pila', group: 'drevari', tier: 'green', type: 'deliverPackage',
    title: 'Pila ze servisu',
    brief: 'Vyzvedni naši motorovou pilu u obchodu a dones ji na pilu. Bez ní tu jen sedíme a pijeme.',
  },
  {
    id: 'drevari-pepa', group: 'drevari', tier: 'yellow', type: 'killBoss',
    title: 'Zelený Pepa',
    brief: 'Šéf Ekologů, Zelený Pepa, nám přivázal dělníka ke smrku. Najdi ho u hráze a vyřeš to.',
  },
  {
    id: 'drevari-franta', group: 'drevari', tier: 'yellow', type: 'protectMember',
    title: 'Franta jde domů',
    brief: 'Franta je v hospodě sťatej a musí na pilu. Ekologové na něj číhají. Doprovoď ho.',
  },
  {
    id: 'drevari-tabor', group: 'drevari', tier: 'red', type: 'sabotage',
    title: 'Protestní tábor',
    brief: 'Ekologové si postavili tábor v lese a nedají nám kácet. Polož k nim nálož a zmiz.',
  },
  // Štamgasti
  {
    id: 'stamgasti-jarda', group: 'stamgasti', tier: 'green', type: 'transportPerson',
    title: 'Jarda domů',
    brief: 'Jarda zase usnul pod stolem. Hoď ho autem domů, než se probudí a začne zpívat.',
  },
  {
    id: 'stamgasti-pivo', group: 'stamgasti', tier: 'yellow', type: 'stealCargo',
    title: 'Pivní krize',
    brief: 'Hospodě došlo pivo a dodávka s ním stojí u obchodu. Přivez ji. Zaplatíme… možná.',
  },
  {
    id: 'stamgasti-konvoj', group: 'stamgasti', tier: 'red', type: 'robConvoy',
    title: 'Konkurenční pivovar',
    brief: 'Dvě dodávky konkurenčního pivovaru jedou přes Morávku. Ať nedojedou. Nikam.',
  },
  // Ekologové
  {
    id: 'ekologove-traktor', group: 'ekologove', tier: 'green', type: 'destroyVehicle',
    title: 'Smrdutý traktor',
    brief: 'Dřevaři mají u pily traktor, co kouří víc než celá hospoda. Znič ho.',
  },
  {
    id: 'ekologove-pila', group: 'ekologove', tier: 'yellow', type: 'sabotage',
    title: 'Ticho na pile',
    brief: 'Na pile řežou dnem i nocí. Polož nálož k jejich katru a uteč. Za stromy!',
  },
  {
    id: 'ekologove-kazimir', group: 'ekologove', tier: 'red', type: 'killBoss',
    title: 'Mistr Kazimír',
    brief: 'Mistr pily Kazimír pokácel posvátný buk. Je na pile se svými chlapy. Ať je to poslední buk.',
  },
  // Škola
  {
    id: 'skola-auto', group: 'skola', tier: 'green', type: 'stealVehicle',
    title: 'Auto pro třídu',
    brief: 'Potřebujeme auto na výlet. Před hospodou stojí jedno, Štamgasti stejně neřídí. Přivez ho na hřiště.',
  },
  {
    id: 'skola-honicka', group: 'skola', tier: 'yellow', type: 'evadePolice',
    title: 'Zkouška odvahy',
    brief: 'Kluci tvrdí, že fízlům neutečeš. Dokaž jim opak. Zavolali jsme je za tebe.',
  },
  {
    id: 'skola-utok', group: 'skola', tier: 'red', type: 'surviveAttack',
    title: 'Obrana hřiště',
    brief: 'Štamgasti si přišli pro pomstu za ukradené pivo. Pomoz nám ubránit hřiště!',
  },
];

export const TIER_NAMES: Record<Tier, string> = { green: 'Zelená', yellow: 'Žlutá', red: 'Červená' };
