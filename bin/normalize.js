const _      = require('lodash');
const fs     = require('fs');
const path   = require('path');
const mkdirs = require('node-mkdirs');
const config = require('./config');

const characterBerriedStatsRaw = require(path.resolve(config.decryptOutputDir, 'get_character_addstatmax.json'));
const characterInheritanceRaw  = require(path.resolve(config.decryptOutputDir, 'get_character_epiclevelstat.json'));
const characterStatRaw         = require(path.resolve(config.decryptOutputDir, 'get_character_stat.json'));
const characterVisualRaw       = require(path.resolve(config.decryptOutputDir, 'get_character_visual.json'));

const weaponRaw                = require(path.resolve(config.decryptOutputDir, 'get_weapon.json'));

const sigilsRaw                = require(path.resolve(config.decryptOutputDir, 'get_carvestone.json'));
const sigilsSetsRaw            = require(path.resolve(config.decryptOutputDir, 'get_carvestone_set.json'));
const sigilsOptionsRaw         = require(path.resolve(config.decryptOutputDir, 'get_carvestone_option.json'));

const berriesRaw               = require(path.resolve(config.decryptOutputDir, 'get_addstatitem.json'));

const breadsRaw                = require(path.resolve(config.decryptOutputDir, 'get_bread.json'));

const costumesRaw              = require(path.resolve(config.decryptOutputDir, 'get_costume.json'));

const text0Raw = require(path.resolve(config.decryptOutputDir, 'get_text1_en_us_0.json'));                          
const text1Raw = require(path.resolve(config.decryptOutputDir, 'get_text1_en_us_1.json'));
const text2Raw = require(path.resolve(config.decryptOutputDir, 'get_text1_en_us_2.json'));
const text3Raw = require(path.resolve(config.decryptOutputDir, 'get_text2_en_us_0.json'));

/* ------------------------------- UTILITY FUNCTION ---------------------------------------------- */
const factionsMapping = {
	'FREE': 'heroes_of_freedom',
	'PUMP': 'pumpkin_city',
	'NETH': 'neth_empire',
	'EAST': 'ryu',
	'HAN': 'han',
	'WEST': 'sw_alliance',
	'NOS': 'nosgard',
	'GRAN': 'grancia_empire',
	'ROMAN': 'roman_republic',
	'GODDESS': 'order_of_goddess',
	'MINO': 'tribes_confederation',
    'CHEN': 'chen',
};

const classIdMapping = {
	CLA_ARCHER: 'archer',
	CLA_HUNTER: 'hunter',
	CLA_PALADIN: 'paladin',
	CLA_PRIEST: 'priest',
	CLA_WARRIOR: 'warrior',
	CLA_WIZARD: 'wizard',
}

const typeMapping = {
	ADVENTURER: 'promotble',
	DESTINY: 'legendary',
	LIMITED: 'secret',
	LEGENDARY: 'promotable'
};

const weaponsClassesMapping = {
    CAT_STAFF: 'staff',
    CAT_SWORD: 'sword',
    CAT_ORB: 'orb',
    CAT_BOW: 'bow',
    CAT_GUN: 'gun',
    CAT_HAMMER: 'hammer',
};

const weaponsRarityMapping = {
	BAIT_GOLD:    'gold',
	BAIT_IRON:    'iron',
	BAIT_CRYSTAL: 'crystal',
	NORMAL:       'generic',
	ANTIQUE:      'old',
	NONE:         null,
	LEGENDARY:    'sbw',
	LIMITED:      'sbw,secret',
	null:         null,
};

const weaponSlotValue = {
    "ATTACK":    0b0001,
    "NONE":      0b0010,
    "DEFENSE":   0b0011,
    "UTILITY":   0b0100,
    "RANDOM":    0b0101,
    "EXCLUSIVE": 0b0110
};

const skinsAndBerriesStatsMapping = {
	Accuracy: 'accuracy',
	Armor: 'armor',
	AttackPower: 'atk_power',
	CriticalDamage: 'crit_dmg',
	CriticalChance: 'crit_chance',
	Dodge: 'evasion',
	Great: 'great',
	HP: 'hp',
	Resistance: 'resistance',
	All: 'all'
};

function writeJsonToOutput(filename, object) {
	const file = path.resolve(config.jsonOutputDir, filename + '.json');
	mkdirs(path.dirname(file));
	fs.writeFile(file, JSON.stringify(object, null, 4), 'utf8', (err) => { if (err) console.err(`Unable to write to file "${filename}":`, err) });
}

const arrayToObjectsWithIdAsKeyReducer = (res, el) => (res[el.id] = el, res);
/* ------------------------------- UTILITY FUNCTION END ------------------------------------------ */

/* ------------------------------- NORMALIZE TRANSLATIONS ---------------------------------------- */
const text = _.reduce(_.concat(text0Raw.text1, text1Raw.text1, text2Raw.text1, text3Raw.text2)
	, (res, obj) => (res[Object.keys(obj)[0]] = { text: obj[Object.keys(obj)[0]], community_edited: 0 }, res), {}
);
/* ------------------------------- NORMALIZE TRANSLATIONS END ------------------------------------ */

/* ------------------------------- NORMALIZE GENERIC WEAPONS ------------------------------------- */
function mapWeapon(weaponRaw) {
	return {
		name: weaponRaw.name,
		image: weaponRaw.image,
		ability: weaponRaw.desc,
		star: weaponRaw.grade,
		atk_power: weaponRaw.attdmg,
		atk_speed: weaponRaw.attspd,
		options: weaponSlotValue[weaponRaw.convert_slot_1] + (weaponSlotValue[weaponRaw.convert_slot_2] << 4) + (weaponSlotValue[weaponRaw.convert_slot_2] << 8),
		class: weaponsClassesMapping[weaponRaw.classid],
		type: weaponsRarityMapping[weaponRaw.bait_type ? (weaponRaw.rarity + '_' + weaponRaw.bait_type) : weaponRaw.rarity],
	};
}

const genericWeapons = _.filter(weaponRaw.weapon, (weapon) => !!weapon.reqhero_ref).map(mapWeapon);
/* ------------------------------- NORMALIZE GENERIC WEAPONS END --------------------------------- */

/* ------------------------------- NORMALIZE HEROES ---------------------------------------------- */

// Map soulbounds used by hero, so it can be accessed by hero ingame id
const soulbounds = _.reduce(weaponRaw.weapon, (res, obj) => { 
	if (!obj.reqhero_ref) 
		return res; 
	
	if (!res[obj.reqhero_ref])
		res[obj.reqhero_ref] = [];

	res[obj.reqhero_ref].push(obj);

	return res; 
}, {});

function mapBerriesMaxStats(bms) {
	return {
		atk_power: bms.attackpower,
		hp: bms.hp,
		crit_chance: bms.criticalchance,
		armor: bms.armor,
		resistance: bms.resistance,
		crit_dmg: bms.criticaldamage,
		accuracy: bms.accuracy,
		evasion: bms.dodge,
	};
}

// Map berries additional stats so they can be accessed by hero berries stats id
const maxBerriesStats = _.reduce(characterBerriedStatsRaw.character_add_stat_max, (res, el) => (res[el.id] = mapBerriesMaxStats(el), res), {null : null});

function toType(hero) {
	if (hero.isgachagolden && (hero.rarity == 'LEGENDARY')) return 'contract';
	
	return typeMapping[hero.rarity];
};

const heroToSkinsIds = _.reduce(costumesRaw.costume, 
	(res, el, idx) => _.reduce(el.wearable_charid, (res1, el1) => (res1[el1] ? res1[el1].push(idx) : res1[el1] = [idx], res), res), {});

const skinsRarityMappings = {
	CONTRACT: 'event',
	HIDDEN: 'secret',
	LIMITED: 'event',
	NORMAL: 'normal',
};

const heroToForms = (heroesRaw) => {
	const heroesFormsRaw = _.map(heroesRaw, (hero) => (hero.stats = character_stat[hero.default_stat_id], hero));

	const firstForm = heroesFormsRaw[0];

	let hero = {
		readableId : (text[firstForm.name].text || firstForm.name).toLowerCase().split(' ').join('_'),
		faction: factionsMapping[firstForm.domain],
		class: classIdMapping[firstForm.classid],
		type: toType(firstForm),
		forms: [],
		sbws: [],
	}

	let skinsIds = [];

	for (const formRaw of heroesFormsRaw) {
		const stats = formRaw.stats;

		let form = {
			name: formRaw.name,
			image: formRaw.face_tex,
			star: stats.grade,
			atk_power: (1 + (stats.grade - 1) / 10) * (stats.initialattdmg + stats.growthattdmg * stats.grade * 10),
			hp: (1 + (stats.grade - 1) / 10) * (stats.initialhp + stats.growthhp * stats.grade * 10),
			crit_chance: stats.critprob,
			armor: (1 + (stats.grade - 1) / 10) * (stats.defense + stats.growthdefense * stats.grade * 10),
			resistance: (1 + (stats.grade - 1) / 10) * (stats.resist + stats.growthresist * stats.grade * 10),
			crit_dmg: stats.critpower,
			accuracy: 0,
			evasion: 0,
			lore: formRaw.desc,
			skill_lvl: stats.grade < 4 ? 1 : (stats.grade == 6 ? 3 : 2),
			passive_name: stats.skill_subname,
			block_name: stats.skill_name,
			block_description: stats.skill_desc,
			passive_description: stats.skill_subdesc,
			max_berries: maxBerriesStats[stats.addstatmaxid]
		};

		hero.forms.push(form);

		const possibleSkinIds = heroToSkinsIds[formRaw.id];

		skinsIds = _.uniq(skinsIds.concat(possibleSkinIds));

		hero.sbws = hero.sbws.concat(_.map(soulbounds[formRaw.id] || [], mapWeapon));
	}

	hero.forms = hero.forms.sort((a, b) => a.star - b.star);

	hero.skins = skinsIds.filter(id => id).map(id => {
		const raw = costumesRaw.costume[id];

		return {
			image: raw.face_tex,
			cost:  raw.price,
			name: raw.costumename,
			stats: _.reduce(raw.addstatjson, (res, el) => (res[skinsAndBerriesStatsMapping[el.Type]] = el.Value, res), {})
		};
	});

	return hero;
};

const character_stat = _.reduce(characterStatRaw.character_stat.filter(c => c.herotype), arrayToObjectsWithIdAsKeyReducer, {});

const charactes_parsed = _.reduce(
	_.groupBy(characterVisualRaw.character_visual.filter(c => c.type == 'HERO'), hero => hero.classid),
	(res, classid, key) => {
		res[key] = _.reduce(
			_.groupBy(classid, hero => hero.rarity),
			(res, rarity, key) => {
				if ('ADVENTURER'.toLowerCase() === (key || '').toLowerCase()) {
					res[key] = _.map(rarity, hero => heroToForms([hero])).filter(hero => !!hero);

					return res;
				}

				const groupedHeroes = _.groupBy(rarity, hero => hero.subnumber);
				const r = [];

				for (const groupKey in groupedHeroes) {
					const hero = heroToForms(groupedHeroes[groupKey]);
					
					if (!hero) continue;

					r.push(hero);
				}

				res[key] = r;

				return res;
			}, {}
		);
		return res;
	}, {}
);

let heroesTranslationsIndex = {};
let characters = [];

for (const clazz in charactes_parsed) {
	for (const rarity in charactes_parsed[clazz]) {
		for (const hero of charactes_parsed[clazz][rarity]) {
			const heroId = characters.push(hero) - 1;

			for (const formId in hero.forms) {
				heroesTranslationsIndex[hero.forms[formId].name] = `${heroId}.${formId}`;
			}
			
			for (const skinId in hero.skins) {
				heroesTranslationsIndex[hero.skins[skinId].name] = `${heroId}.${skinId}`;
			}
		}
	}
}
/* ------------------------------- NORMALIZE HEROES END ------------------------------------------ */

/* ------------------------------- NORMALIZE SIGILS ---------------------------------------------- */
const sigilsSets  = _.reduce(sigilsSetsRaw.carve_stone_set, arrayToObjectsWithIdAsKeyReducer, {});
const sigilsStats = _.reduce(sigilsOptionsRaw.carve_stone_option, arrayToObjectsWithIdAsKeyReducer, {});

const sigilsRarityMap = {
	COMMON : 'common',
	RARE   : 'rare',
	EPIC   : 'epic',
};

let sigilsTranslationsIndex = {};

const sigils = sigilsRaw.carve_stone.map((raw, idx) => {
	let set = null, setRaw = null;
	
	if (setRaw = sigilsStats[raw.setid]) {
		set = {
			name: setRaw.name,
			effect: setRaw.desc,
			pair: setRaw.paircarvestoneid,
		}
	}

	const statsRaw = _.reduce(raw.optionidjson.map(id => sigilsStats[id]), (res, el) => {
		_.entries(el).map(kv => res[kv[0]] = res[kv[0]] ? (res[kv[0]] + kv[1]) : kv[1]);
		return res;
	}, {});

	sigilsTranslationsIndex[raw.name] = idx;

	return {
		ingame_id: raw.id,

		name: raw.name,
        description: raw.desc,
        image: raw.image,
        grade: raw.grade,
        rarity: sigilsRarityMap[raw.raritytype],
        sell_cost: raw.sell_reward_amount,
        extract_cost: raw.unequip_cost_amount,
        
        stats: {
        	atk_power: statsRaw.atkpower,
			hp: statsRaw.maxhp,
			crit_chance: statsRaw.critrate,
			armor: statsRaw.def,
			resistance: statsRaw.rst,
			crit_dmg: statsRaw.critpowerrate,
			accuracy: statsRaw.accuracyrate,
			evasion: statsRaw.dodgerate,
			armor_pen: statsRaw.penetratedef,
			resistance_pen: statsRaw.penetraterst,
			dmg_reduction: statsRaw.receivedmgrate,
			lifesteal: statsRaw.vamprate,
			atk_speed: statsRaw.atkspeed,
			crit_chance_reduction: statsRaw.critdodgerate,
        },

        set: set,
	};
});
/* ------------------------------- NORMALIZE SIGILS END ------------------------------------------ */

/* ------------------------------- NORMALIZE BERRIES --------------------------------------------- */
let berriesTranslationsIndex = {}

const berries = berriesRaw.add_stat_item.map((raw, idx) => {
	berriesTranslationsIndex[raw.name] = idx;

	return {
		name: raw.name,
		rarity: raw.rarity.toLowerCase(),
		target_stat: skinsAndBerriesStatsMapping[raw.type.replace('Ratio', '')],
		is_percentage: raw.type.includes('Ratio') || raw.type === "Great" || raw.type === "All",
		value: raw.addstatpoint,
		great_chance: raw.greatprob,
		grade: raw.grade,
		image: raw.image,
		category: raw.category.toLowerCase(),
		sell_cost: raw.sellprice,
		eat_cost: raw.eatprice,
	};
});
/* ------------------------------- NORMALIZE BERRIES END ----------------------------------------- */

/* ------------------------------- NORMALIZE BREADS --------------------------=------------------- */
let breadsTranslationsIndex = {};

const breads = breadsRaw.bread.map((raw, idx) => {
	breadsTranslationsIndex[raw.name] = idx;

	return {
		name: raw.name,
		rarity: raw.rarity.toLowerCase(),
		value: raw.trainpoint,
		great_chance: raw.critprob,
		grade: raw.grade,
		image: raw.image,
		sell_cost: raw.sellprice,
	};
});
/* ------------------------------- NORMALIZE BREADS END ------------------------------------------ */

/* ------------------------------- TRANSLATION INDICIES ------------------------------------------ */
const indiciesToCache = (index) => Object.keys(index).map((k) => (_.defaults({ key: k, path: index[k] }, text[k])));
/*
const translationsIndicies = {
	'heroes':  heroesTranslationsIndex, // includes skins and forms
	'breads':  breadsTranslationsIndex,
	'berries': berriesTranslationsIndex,
	'sigils':  sigilsTranslationsIndex,
}
*/
const translationsIndicies = {
	'heroes':  indiciesToCache(heroesTranslationsIndex),
	'breads':  indiciesToCache(breadsTranslationsIndex),
	'berries': indiciesToCache(berriesTranslationsIndex),
	'sigils':  indiciesToCache(sigilsTranslationsIndex),
}
/* ------------------------------- TRANSLATION INDICIES END -------------------------------------- */

writeJsonToOutput('translations_indicies', translationsIndicies);
writeJsonToOutput('generic_weapons', genericWeapons);
writeJsonToOutput('translations', text);
writeJsonToOutput('heroes_forms_with_sbw_and_skins', characters);
writeJsonToOutput('sigils', sigils);
writeJsonToOutput('berries', berries);
writeJsonToOutput('breads', breads);