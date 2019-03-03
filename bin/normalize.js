const _      = require('lodash');
const fs     = require('fs');
const path   = require('path');
const mkdirs = require('node-mkdirs');
const config = require('./config');
const axios  = require('axios');

(async () => {  // ASYNC MAIN - to use await inside;

const requireData = (filename) => require(path.resolve(config.decryptOutputDir, filename));

const characterBerriedStatsRaw = requireData('get_character_addstatmax.json');
const characterInheritanceRaw  = requireData('get_character_epiclevelstat.json');
const characterStatRaw         = requireData('get_character_stat.json');
const characterVisualRaw       = requireData('get_character_visual.json');

const weaponRaw                = requireData('get_weapon.json');

const sigilsRaw                = requireData('get_carvestone.json');
const sigilsSetsRaw            = requireData('get_carvestone_set.json');
const sigilsOptionsRaw         = requireData('get_carvestone_option.json');

const berriesRaw               = requireData('get_addstatitem.json');

const breadsRaw                = requireData('get_bread.json');

const costumesRaw              = requireData('get_costume.json');

const sistersRaw               = requireData('get_sister.json');

const domainsRaw               = requireData('get_champion_domain.json');

const portraitsRaw             = requireData('get_portraitdata.json');

const championSkillRaw         = requireData('get_champion_skill.json');
const championSlotRaw          = requireData('get_champion_slot.json');
const championRaw              = requireData('get_champion.json');

const spSkillsRaw              = requireData('get_spskill.json');

const fishRaw                  = requireData('get_fish.json');
const fishGearRaw              = requireData('get_fishinggear.json');
const fishPondsRaw             = requireData('get_fishery.json');

const dialoguesRaw             = requireData('get_dialoguetalkjson.json');

const text0Raw = requireData('get_text1_en_us_0.json');
const text1Raw = requireData('get_text1_en_us_1.json');
const text2Raw = requireData('get_text1_en_us_2.json');
const text3Raw = requireData('get_text2_en_us_0.json');
const text4Raw = requireData('get_text2_en_us_1.json');

const gameVersion = await axios.get('http://downloadapk.net/Crusaders-Quest.html').then(r => r.data.match(/<p\s+itemprop="softwareVersion">\s*(\d+\.\d+\.\d+).*<\/p>/)[1]);

let oldTranslations = {};

try { 
	oldTranslations = require(path.resolve(config.jsonOutputDir, 'translations.json')) 
} catch (e) { console.log('No old version translations found'); }

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
};

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
	fs.writeFile(file, JSON.stringify(object, null, 4), 'utf8', (err) => { if (err) console.error(`Unable to write to file "${filename}":`, err) });
}

const arrayToObjectsWithIdAsKeyReducer = (res, el) => (res[el.id] = el, res);
/* ------------------------------- UTILITY FUNCTION END ------------------------------------------ */

/* ------------------------------- NORMALIZE TRANSLATIONS ---------------------------------------- */
const text = _.reduce(_.concat(text0Raw.text1, text1Raw.text1, text2Raw.text1, text3Raw.text2, text4Raw.text2), 
	(res, obj) => {
		if (!res[Object.keys(obj)[0]] || res[Object.keys(obj)[0]].text !== obj[Object.keys(obj)[0]]) 
			res[Object.keys(obj)[0]] = { text: obj[Object.keys(obj)[0]], version: gameVersion, original: true};
		return res;
	}, oldTranslations
);
/* ------------------------------- NORMALIZE TRANSLATIONS END ------------------------------------ */

/* ------------------------------- NORMALIZE GENERIC WEAPONS ------------------------------------- */
function mapWeapon(weaponRaw) {
	return {
		id: weaponRaw.id,
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
const heroesTranslationsKeysIndex = {};

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
	if (hero.isgachagolden && (hero.rarity === 'LEGENDARY')) return 'contract';
	
	return typeMapping[hero.rarity];
}

const heroToSkinsIds = _.reduce(costumesRaw.costume, 
	(res, el, idx) => _.reduce(el.wearable_charid, (res1, el1) => (res1[el1] ? res1[el1].push(idx) : res1[el1] = [idx], res), res), {});

const heroToForms = (heroesRaw) => {
	const heroesFormsRaw = _.map(heroesRaw, (hero) => (hero.stats = character_stat[hero.default_stat_id], hero));

	const firstForm = heroesFormsRaw[0];

	const id = (text[firstForm.name].text || firstForm.name).toLowerCase().split(' ').join('_');

	let hero = {
		id,
		readableId : id,
		faction: factionsMapping[firstForm.domain],
		class: classIdMapping[firstForm.classid],
		type: toType(firstForm),
		gender: (firstForm.gender || '').toLowerCase(),
		domain: firstForm.domain,
		forms: [],
		sbws: [],
		portraits: [],
	};

	let skinsIds = [];

	for (const formRaw of heroesFormsRaw) {
		const stats = formRaw.stats;

		let form = {
			id: formRaw.id,
			name: formRaw.name,
			image: formRaw.face_tex,
			star: stats.grade,
			atk_power: (1 + (stats.grade - 1) / 10) * (stats.initialattdmg + stats.growthattdmg * (stats.grade * 10 - 1)),
			hp: (1 + (stats.grade - 1) / 10) * (stats.initialhp + stats.growthhp * (stats.grade * 10 - 1)),
			crit_chance: stats.critprob,
			armor: (1 + (stats.grade - 1) / 10) * (stats.defense + stats.growthdefense * (stats.grade * 10 - 1)),
			resistance: (1 + (stats.grade - 1) / 10) * (stats.resist + stats.growthresist * (stats.grade * 10 - 1)),
			crit_dmg: stats.critpower,
			accuracy: 0,
			evasion: 0,
			lore: formRaw.desc,
			block_image: stats.skill_icon,
			skill_lvl: stats.grade < 4 ? 1 : (stats.grade === 6 ? 3 : 2),
			passive_name: stats.skill_subname,
			block_name: stats.skill_name,
			block_description: stats.skill_desc,
			passive_description: stats.skill_subdesc,
			max_berries: maxBerriesStats[stats.addstatmaxid]
		};

		if (formRaw.portrait ) {
			const portraits = portraitsRaw.portrait[formRaw.portrait];

			if (portraits)
				hero.portraits.push(Object.keys(portraits)[0]);
		}

		hero.forms.push(form);

		const possibleSkinIds = heroToSkinsIds[formRaw.id];

		skinsIds = _.uniq(skinsIds.concat(possibleSkinIds));

		const formSbws = _.map(soulbounds[formRaw.id] || [], mapWeapon);

		hero.sbws = hero.sbws.concat(formSbws);

		heroesTranslationsKeysIndex[formRaw.name] = `${text[formRaw.name].text} (${stats.grade}★) name`;
		heroesTranslationsKeysIndex[formRaw.desc] = `${text[formRaw.name].text} (${stats.grade}★) lore`;
		heroesTranslationsKeysIndex[stats.skill_name] = `${text[formRaw.name].text} (${stats.grade}★) block name`;
		heroesTranslationsKeysIndex[stats.skill_desc] = `${text[formRaw.name].text} (${stats.grade}★) block description`;
		heroesTranslationsKeysIndex[stats.skill_subname] = `${text[formRaw.name].text} (${stats.grade}★) passive name`;
		heroesTranslationsKeysIndex[stats.skill_subdesc] = `${text[formRaw.name].text} (${stats.grade}★) passive description`;

		for (const sbw of formSbws) {
			heroesTranslationsKeysIndex[sbw.name] = `${text[formRaw.name].text} (${stats.grade}★) SBW name`;
			heroesTranslationsKeysIndex[sbw.ability] = `${text[formRaw.name].text} (${stats.grade}★) SBW ability`;
		}
	}

	hero.forms = hero.forms.sort((a, b) => a.star - b.star);

	hero.skins = skinsIds.filter(id => id).map(id => {
		const raw = costumesRaw.costume[id];

		return {
			id,
			image: raw.face_tex,
			cost:  raw.sellprice,
			name: raw.costumename,
			stats: _.reduce(raw.addstatjson, (res, el) => (res[skinsAndBerriesStatsMapping[el.Type]] = el.Value, res), {})
		};
	});

	return hero;
};

const character_stat = _.reduce(characterStatRaw.character_stat, arrayToObjectsWithIdAsKeyReducer, {});

const charactes_parsed = _.reduce(
	_.groupBy(characterVisualRaw.character_visual.filter(c => c.type === 'HERO'), hero => hero.classid),
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

				for (const groupKey of Object.getOwnPropertyNames(groupedHeroes)) {
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

for (const clazz of Object.getOwnPropertyNames(charactes_parsed)) {
	for (const rarity of Object.getOwnPropertyNames(charactes_parsed[clazz])) {
		for (const hero of charactes_parsed[clazz][rarity]) {
			const heroId = characters.push(hero) - 1;

			for (const formId of Object.getOwnPropertyNames(hero.forms)) {
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
	1000   : 'rare',
	500    : 'common',
	2000   : 'epic',
};

let sigilsTranslationsIndex = {};

const sigils = sigilsRaw.carve_stone.map((raw, idx) => {
	let set = null;
	
	if (sigilsSets[raw.setid]) {
		const setRaw = sigilsSets[raw.setid];

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
        id: raw.id,

		name: raw.name,
        description: raw.desc,
        image: raw.image,
        grade: raw.grade,
        rarity: sigilsRarityMap[raw.sell_reward_amount],
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
let berriesTranslationsIndex = {};

const berries = berriesRaw.add_stat_item.map((raw, idx) => {
	berriesTranslationsIndex[raw.name] = idx;

	return {
		id: raw.id,
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

/* ------------------------------- NORMALIZE BREADS ---------------------------------------------- */
let breadsTranslationsIndex = {};

const breads = breadsRaw.bread.map((raw, idx) => {
	breadsTranslationsIndex[raw.name] = idx;

	return {
		id: raw.id,
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

/* ------------------------------- NORMALIZE GODDESSES ------------------------------------------- */
let goddessesTranslationsIndex = {};

const goddesses = sistersRaw.sister.map((raw, idx) => {
	goddessesTranslationsIndex[raw.name] = idx;

	return {
		id: raw.id,
		name: raw.name,
		image: raw.dsp_tex,
		skill_name: raw.skillname,
		skill_description: raw.skilldesc,
		ingame_id: raw.id,
	};
});
/* ------------------------------- NORMALIZE GODDESSES END --------------------------------------- */

/* ------------------------------- NORMALIZE GODDESSES ------------------------------------------- */
let domainsTranslationsIndex = {};

const domains = domainsRaw.champion_domain.map((raw, idx) => {
	domainsTranslationsIndex[raw.name] = idx;

	return {
		id: raw.id,
		name: raw.name,
		image: raw.emblem_image,
		ingame_id: raw.id,
	};
});
/* ------------------------------- NORMALIZE GODDESSES END --------------------------------------- */

/* ------------------------------- NORMALIZE INHERITANCE ----------------------------------------- */
const inheritance = {
	archer:  {},
	hunter:  {},
	paladin: {},
	priest:  {},
	warrior: {},
	wizard:  {},
};

for (const statsRaw of characterInheritanceRaw.character_epic_level_stat) {
	inheritance[classIdMapping[statsRaw.class]][statsRaw.epiclevel] = {
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
	}
}
/* ------------------------------- NORMALIZE INHERITANCE END ------------------------------------- */

/* ------------------------------- NORMALIZE CHAMPTIONS ------------------------------------------ */
const championsTexts  = _.reduce(championRaw.champion, arrayToObjectsWithIdAsKeyReducer, {});
const championsSkills = _.reduce(championSkillRaw.champion_skill, arrayToObjectsWithIdAsKeyReducer, {});
let championsTranslationsIndex = {};

const mapSkill = (raw) => (raw ? {
	id: raw.id,
	name: raw.name,
	description: raw.desc,
	image: raw.skillicon,
	grade: raw.level,
} : null);

const champions = _.reduce(_.groupBy(championSlotRaw.champion_slot, 'id'), (res, val, key) => {
	const champ = championsTexts[key];

	res.push({
		id: key,
		forms: val.map(form => {
			const skills = [championsSkills[form.slot_1], championsSkills[form.slot_2], championsSkills[form.slot_3]].filter(el => !!el);

			return {
				grade: form.level,
				active: mapSkill(skills.filter(s => s.type.toLowerCase() === "active")[0]),
				passive: mapSkill(skills.filter(s => s.type.toLowerCase() === "passive")[0]),
				exclusive: mapSkill(skills.filter(s => s.type.toLowerCase() === "exclusive")[0]),
			};
		}),
		portrait: champ.portrait,
		illustration: champ.illust,
		image: champ.faceimage,
		name: champ.name,
		lore: champ.background_textid,
		type: champ.type.toLowerCase(),
	});

	return res;
}, []);

champions.forEach((champ, idx) => championsTranslationsIndex[champ.name] = idx);
/* ------------------------------- NORMALIZE CHAMPTIONS END -------------------------------------- */

/* ------------------------------- NORMALIZE SP SKILLS ------------------------------------------- */
const spMax = spSkillsRaw.sp_skill.filter(s => s.unlockcond.next_id === 'MAX');

let spSkillsTranslationsIndex = {};

const spSkills = spMax.map(s => {
	let spTree = [s];

	for (let skill = spSkillsRaw.sp_skill.filter(c => c.unlockcond.next_id === spTree[spTree.length - 1].id)[0]; skill; skill = spSkillsRaw.sp_skill.filter(c => c.unlockcond.next_id === spTree[spTree.length - 1].id)[0]) {
		spTree.push(skill);
	}

	return {
		id: (s.name || '').toLowerCase(),
		name: s.name,
		class: classIdMapping[s.class],
		type: s.type.toLowerCase(),
		forms: spTree.reverse().map(s => ({
			level: s.level,
			description: s.desc,
			short_description: s.simpledesc,
			image: s.icon,
		}))
	};
});

spSkills.forEach((skill, idx) => spSkillsTranslationsIndex[skill.name] = idx);
/* ------------------------------- NORMALIZE SP SKILLS END --------------------------------------- */

/* ------------------------------- NORMALIZE BOSSES ---------------------------------------------- */
const bossesTranslationIndices = {};

const bosses = characterVisualRaw.character_visual
	.filter(c => c.type === 'BOSS')
	.map((c, idx) => {
		const stats = character_stat[c.default_stat_id];

		bossesTranslationIndices[c.name] = idx;

		return {
			id: c.id,
            name: c.name,
            image: c.face_tex,
            atk_power: (1 + (stats.grade - 1) / 10) * (stats.initialattdmg + stats.growthattdmg * (stats.grade * 10 - 1)),
            hp: (1 + (stats.grade - 1) / 10) * (stats.initialhp + stats.growthhp * (stats.grade * 10 - 1)),
            crit_chance: stats.critprob,
            armor: (1 + (stats.grade - 1) / 10) * (stats.defense + stats.growthdefense * (stats.grade * 10 - 1)),
            resistance: (1 + (stats.grade - 1) / 10) * (stats.resist + stats.growthresist * (stats.grade * 10 - 1)),
            crit_dmg: stats.critpower,
            accuracy: stats.hitrate,
            evasion: stats.dodgerate,
			lifesteal: stats.vamp,
            armor_pen: stats.penetratedef,
            resistance_pen: stats.penetraterst,
            dmg_reduction: stats.dmgreduce,
		};
	});
/* ------------------------------- NORMALIZE BOSSES END ------------------------------------------ */

/* ------------------------------- NORMALIZE FISH AND GEAR --------------------------------------- */
const fishesTranslationIndices = {};

const fishes = fishRaw.fish.map((f, idx) => {
	fishesTranslationIndices[f.name] = idx;

	const rewards = [];

	if (f.sellvalue) {
		rewards.push({
			type: f.sellvalue,
			amount: f.sellamount,
		});
	}

    if (f.sellvalue_2nd) {
        rewards.push({
            type: f.sellvalue_2nd,
            amount: f.sellamount_2nd,
        });
    }

	return {
		id: f.id,
		name: f.name,
		habitat: f.habitat.toLowerCase(),
		description: f.description,
		type: f.type.toLowerCase(),
		rank: f.rank.toLowerCase(),
		grade: f.rarity,
		starts_from: f.minlength,
		image: f.texture,
		exp: f.exp,
		rewards,
    };
});

const fishingGearTranslationIndices = {};

const fishingGear = fishGearRaw.fishing_gear.map((g, idx) => {
	fishingGearTranslationIndices[g.name] = idx;

	return {
		id: g.id,
		name: g.name,
		description: g.description,
		type: g.type.toLowerCase(),
		grade: g.level,
		habitat: g.habitat.toLowerCase(),
		habitat_bouns: g.habitatvalue,
		power: g.atk,
		big_chance: g.addrarity,
		bite_chance: g.addbite,
		event_chance: g.addrarityevent,
		currency: g.cost_value,
		price: g.cost_amount,
		image:  g.geartexture,
	}
});

const pondsTranslationIndices = {};

const ponds = fishPondsRaw.fishery.map((p, idx) => {
	pondsTranslationIndices[p.name] = idx;

	return {
		id: p.id,
		name: p.name,
		description: p.desc,
		min_fr: p.enterlevel,
		fish: p.fish,
		junk: p.junk,
		hero: p.hero,
		habitat: p.watercondition,
		boss: p.boss,
		reward: {
			type: p.bonusvalue,
			amount: p.bonusamount,
		},
		background: p.bgpreview,
	}
});
/* ------------------------------- NORMALIZE FISH AND GEAR END ----------------------------------- */

/* ------------------------------- NORMALIZE PORTRAITS ------------------------------------------- */
const dialogPortraitsRaw = dialoguesRaw.dialogue_talk_json.reduce((res, c) => {
    if (!c.actions || !c.texture) return res;

    let e = res[c.talkername] || {};

	Object.keys(c.actions).filter(a => {
		let action = c.actions[a];

		if (typeof action !== 'string')
			return false;

		action = action.toLowerCase();

		return (
			action.includes('appear') && !action.includes('di') ||
			action === 'fadein' || action === 'fadrin' ||
			action === 'change'
        );
	}).filter(a => c.texture[a]).map(a => e[c.texture[a]] = 1);

	res[c.talkername] = e;

	return res;
}, {});

const portraits = {};

for (const key of Object.getOwnPropertyNames(dialogPortraitsRaw)) {
    portraits[key] = Object.getOwnPropertyNames(dialogPortraitsRaw[key]);
}

for (const hero of characters) {
	for (const form of hero.forms) {
        const p = (portraits[form.name] || []).concat(hero.portraits);

        if (p.length)
            portraits[form.name] = _.uniq(p.concat(hero.portraits));
	}
}

const portraitsTranslationIndex = {};

for (const key of Object.getOwnPropertyNames(portraits)) {
	portraitsTranslationIndex[key] = key;
}
/* ------------------------------- NORMALIZE PORTRAITS END --------------------------------------- */

/* ------------------------------- TRANSLATION INDICIES ------------------------------------------ */
const indiciesToCache = (index, collection) => Object.keys(index).map(
	(k) => _.defaults({ key: k, path: `${collection}.${index[k]}` }, text[k])
);

const translationsIndices = {
	'heroes':  indiciesToCache(heroesTranslationsIndex, 'heroes'),
	'breads':  indiciesToCache(breadsTranslationsIndex, 'breads'),
	'berries': indiciesToCache(berriesTranslationsIndex, 'berries'),
	'sigils':  indiciesToCache(sigilsTranslationsIndex, 'sigils'),
	'goddesses': indiciesToCache(goddessesTranslationsIndex, 'goddesses'),
	'factions': indiciesToCache(domainsTranslationsIndex, 'factions'),
	'champions': indiciesToCache(championsTranslationsIndex, 'champions'),
    'sp_skills': indiciesToCache(spSkillsTranslationsIndex, 'sp_skills'),
    'bosses': indiciesToCache(bossesTranslationIndices, 'bosses'),
	'fishes': indiciesToCache(fishesTranslationIndices, 'fishes'),
	'fishing_gear': indiciesToCache(fishingGearTranslationIndices, 'fishing_gear'),
	'fishing_ponds': indiciesToCache(pondsTranslationIndices, 'fishing_ponds'),
	'portraits': indiciesToCache(portraitsTranslationIndex, 'portraits'),
};
/* ------------------------------- TRANSLATION INDICIES END -------------------------------------- */

writeJsonToOutput('berries', berries);
writeJsonToOutput('bosses', bosses);
writeJsonToOutput('breads', breads);
writeJsonToOutput('champions', champions);
writeJsonToOutput('factions', domains);
writeJsonToOutput('fishes', fishes);
writeJsonToOutput('fishing_gear', fishingGear);
writeJsonToOutput('fishing_ponds', ponds);
writeJsonToOutput('generic_weapons', genericWeapons);
writeJsonToOutput('goddesses', goddesses);
writeJsonToOutput('heroes', characters);
writeJsonToOutput('heroes_translations_indices', heroesTranslationsKeysIndex);
writeJsonToOutput('inheritance', inheritance);
writeJsonToOutput('sigils', sigils);
writeJsonToOutput('sp_skills', spSkills);
writeJsonToOutput('translations', text);
writeJsonToOutput('portraits', portraits);
writeJsonToOutput('translations_indices', translationsIndices);

})(); // END ASYNC MAIN