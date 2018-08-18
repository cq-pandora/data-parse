const _      = require('lodash');
const fs     = require('fs');
const path   = require('path');
const mkdirs = require('node-mkdirs');

const characterStatRaw   = require(path.join(process.cwd(),'./decrypted/get_character_stat.json'));
const characterVisualRaw = require(path.join(process.cwd(),'./decrypted/get_character_visual.json'));
const weaponRaw          = require(path.join(process.cwd(),'./decrypted/get_weapon.json'));

const text0Raw = require(path.join(process.cwd(),'./decrypted/get_text_en_us_0.json'));
const text1Raw = require(path.join(process.cwd(),'./decrypted/get_text_en_us_1.json'));
const text2Raw = require(path.join(process.cwd(),'./decrypted/get_text_en_us_2.json'));

// const text10Raw = require(path.join(process.cwd(),'./decrypted/get_text1_en_us_0.json'));
// const text11Raw = require(path.join(process.cwd(),'./decrypted/get_text1_en_us_1.json'));
// const text12Raw = require(path.join(process.cwd(),'./decrypted/get_text1_en_us_2.json'));

const text = _.reduce(_.concat(text0Raw.text, text1Raw.text, text2Raw.text
	/*, text10Raw.text, text11Raw.text, text12Raw.text*/
), (res, obj) => _.defaults(res, obj), {});

const soulbounds = _.reduce(weaponRaw.weapon, (res, obj) => { 
	if (!obj.reqhero_ref) 
		return res; 
	
	if (!res[obj.reqhero_ref])
		res[obj.reqhero_ref] = [];

	res[obj.reqhero_ref].push(obj);

	return res; 
}, {});

const genericWeapons = _.filter(weaponRaw.weapon, (weapon) => !!weapon.reqhero_ref);

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
	CAT_HAMMER: 'hammer'
};

const toType = (hero) => {
	if (hero.isgachagolden && (hero.rarity == 'LEGENDARY')) return 'contract';
	
	return typeMapping[hero.rarity];
};

const heroToForms = (heroesRaw) => {
	const heroesFormsRaw = _.map(heroesRaw, (hero) => {
		hero.stats = character_stat[hero.default_stat_id];
		return hero;
	});

	const firstForm = heroesFormsRaw[0];

	if (!text[firstForm.name]) return null;

	let hero = {
		readableId : (text[firstForm.name] || firstForm.name).toLowerCase().split(' ').join('_'),
		faction: factionsMapping[firstForm.domain],
		class: classIdMapping[firstForm.classid],
		type: toType(firstForm),
		forms: [],
		sbws: [],
	}

	for (const form of heroesFormsRaw) {
		const stats = form.stats;

		hero.forms.push({
			name: text[form.name] || form.name,
			texture: form.face_tex,
			star: stats.grade,
			atk_power: (1 + (stats.grade - 1) / 10) * (stats.initialattdmg + stats.growthattdmg * stats.grade * 10),
			hp: (1 + (stats.grade - 1) / 10) * (stats.initialhp + stats.growthhp * stats.grade * 10),
			crit_chance: stats.critprob,
			armor: (1 + (stats.grade - 1) / 10) * (stats.defense + stats.growthdefense * stats.grade * 10),
			resistance: (1 + (stats.grade - 1) / 10) * (stats.resist + stats.growthresist * stats.grade * 10),
			crit_dmg: stats.critpower,
			accuracy: 0, // TODO where?
			evasion: 0, // TODO where?
			lore: text[form.desc],
			skill_lvl: 0, // TODO where?
			skill_passive: text[stats.skill_subname],
			skill_name: text[stats.skill_name],
			skill_desc: text[stats.skill_desc],
			skill_passive_desc: text[stats.skill_subdesc],
		});

		hero.sbws = hero.sbws.concat(_.map(soulbounds[form.id] || [], (sbw) => {
			return {
				name: text[sbw.name] || sbw.name,
				texture: sbw.image,
				ability: text[sbw.desc] || sbw.desc,
				star: sbw.grade,
				atk_power: sbw.attdmg,
				atk_speed: sbw.attspd,
				options: 0,
				class: weaponsClassesMapping[sbw.classid],
				type: 'sbw'
			};
		}));
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

const file = path.join(process.cwd(), 'output', 'parsed.json');

mkdirs(path.dirname(file));

fs.writeFile(file, JSON.stringify(charactes_parsed, null, 4), 'utf8');