const _      = require('lodash');
const fs     = require('fs');
const path   = require('path');
const mkdirs = require('node-mkdirs');

const characterBerriedStatsRaw = require(path.join(process.cwd(),'./decrypted/get_character_addstatmax.json'));    // done
const characterInheritanceRaw  = require(path.join(process.cwd(),'./decrypted/get_character_epiclevelstat.json')); // done
const characterStatRaw         = require(path.join(process.cwd(),'./decrypted/get_character_stat.json'));  	       // done
const characterVisualRaw       = require(path.join(process.cwd(),'./decrypted/get_character_visual.json'));        // done

const weaponRaw                = require(path.join(process.cwd(),'./decrypted/get_weapon.json'));                  // done

const sigilsRaw                = require(path.join(process.cwd(),'./decrypted/get_carvestone.json'));
const sigilsOptionsRaw         = require(path.join(process.cwd(),'./decrypted/get_carvestone_option.json'));

const berriesRaw               = require(path.join(process.cwd(),'./decrypted/get_addstatitem.json'));

const breadsRaw                = require(path.join(process.cwd(),'./decrypted/get_bread.json'));

const costumesRaw              = require(path.join(process.cwd(),'./decrypted/get_costume.json'));

const text0Raw = require(path.join(process.cwd(),'./decrypted/get_text_en_us_0.json'));
const text1Raw = require(path.join(process.cwd(),'./decrypted/get_text_en_us_1.json'));
const text2Raw = require(path.join(process.cwd(),'./decrypted/get_text_en_us_2.json'));

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

function writeJsonToOutput(filename, object) {
	const file = path.join(process.cwd(), 'output', filename + '.json');
	mkdirs(path.dirname(file));
	fs.writeFile(file, JSON.stringify(object, null, 4), 'utf8');
}

function toType(hero) {
	if (hero.isgachagolden && (hero.rarity == 'LEGENDARY')) return 'contract';
	
	return typeMapping[hero.rarity];
};

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

function mapWeapon(weaponRaw) {
	return {
		name: weaponRaw.name,
		texture: weaponRaw.image,
		ability: weaponRaw.desc,
		star: weaponRaw.grade,
		atk_power: weaponRaw.attdmg,
		atk_speed: weaponRaw.attspd,
		options: weaponSlotValue[weaponRaw.convert_slot_1] + weaponSlotValue[weaponRaw.convert_slot_2] << 4 + weaponSlotValue[weaponRaw.convert_slot_2] << 8,
		class: weaponsClassesMapping[weaponRaw.classid],
		type: weaponsRarityMapping[weaponRaw.bait_type ? (weaponRaw.rarity + '_' + weaponRaw.bait_type) : weaponRaw.rarity],
	};
}
/* ------------------------------- UTILITY FUNCTION END ------------------------------------------ */

/* ------------------------------- NORMALIZE TRANSLATIONS ---------------------------------------- */
const text = _.reduce(_.concat(text0Raw.text, text1Raw.text, text2Raw.text)
	, (res, obj) => (res[Object.keys(obj)[0]] = { text: obj[Object.keys(obj)[0]], community_edited: 0 }, res), {}
);
/* ------------------------------- NORMALIZE TRANSLATIONS END ------------------------------------ */

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

const genericWeapons = _.filter(weaponRaw.weapon, (weapon) => !!weapon.reqhero_ref).map(mapWeapon);

// Map berries additional stats so they can be accessed by hero berries stats id
const maxBerriesStats = _.reduce(characterBerriedStatsRaw.character_add_stat_max, (res, el) => (res[el.id] = mapBerriesMaxStats(el), res), {null : null});


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

	for (const formRaw of heroesFormsRaw) {
		const stats = formRaw.stats;

		let form = {
			name: formRaw.name,
			texture: formRaw.face_tex,
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

		hero.sbws = hero.sbws.concat(_.map(soulbounds[formRaw.id] || [], mapWeapon));
	}

	return hero;
};

const character_stat = _.reduce(characterStatRaw.character_stat.filter(c => c.herotype), (res, v) => { res[v.id] = v; return res; }, {});

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
/* ------------------------------- NORMALIZE HEROES END ------------------------------------------ */


writeJsonToOutput('generic_weapons', genericWeapons);
writeJsonToOutput('translations', text);
writeJsonToOutput('heroes_forms_and_sbws', charactes_parsed);