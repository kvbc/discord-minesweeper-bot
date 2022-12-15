const Discord = require('discord.js-selfbot-v13');
const client = new Discord.Client();
const prompt = require("prompt-sync")({ sigint: true });
const sound = require('sound-play')
const BOARD_WIDTH = 11
const BOARD_HEIGHT = 11
const SAPERERER_CHANNEL_ID = "xxx"
 
function vec (x, y) {
	return {
		"x": x,
		"y": y
	}
}
 
function vec_eq (v1, v2) {
	return v1.x==v2.x && v1.y==v2.y
}
 
function vec_arr_eq (v1, v2) {
	return Array.isArray(v1) && Array.isArray(v2) && v1[0]==v2[0] && v1[1]==v2[1]
}

function vec_distance (v1, v2) {
	var nx = v1.x - v2.x
	var ny = v1.y - v2.y
	return Math.sqrt(nx*nx + ny*ny)
}
 
function click_button (msg, id) {
	var buttons = msg.components.flatMap(row => row.components).filter(c => c.type === 'BUTTON');
	var ids = [
		[-1,-1], [0,-1], [1,-1], "flag",
		[-1, 0], "XXXX", [1, 0], "check",
		[-1, 1], [0, 1], [1, 1]
	]
	
	var idx
	if (Array.isArray(id)) {
		idx = ids.findIndex(v => vec_arr_eq(v,id))
	} else {
		idx = ids.indexOf(id)
	}
	buttons[idx].click(msg).catch(e => {})
}
 
client.on('ready', async () => {
	console.log(`Zalogowano jako ${client.user.tag}`);
	
	/*
	var channel_sapererer = client.channels.cache.find(c => c.id == SAPERERER_CHANNEL_ID)
	console.log(`${channel_sapererer.name}`)
	await channel_sapererer.sendSlash(SAPER_BOT_ID, "create")
	await new Promise(res => setTimeout(res, 3000)); 
	channel_sapererer.messages.fetch({limit:10}).then(messages => {
		messages.forEach(msg => {
			if (msg.author.bot) {
				console.log(msg)
				return;
			}
		})
	})
	*/
	
	let prev_board_name = null
	while (true) {
		let channel_plansza = null
		for (;;) {
			channel_plansza = client.channels.cache.find(c => c.name && c.name.includes(client.user.username))
			if (!channel_plansza || channel_plansza.name == prev_board_name) {
				console.log("czekam na /create")
				sound.play('bop.wav')
				await new Promise(res => setTimeout(res, 1000));
				continue;
			}
			break;
		}
		prev_board = channel_plansza.name
		console.log(`Plansza: "${channel_plansza.name}" (ID ${channel_plansza.id})`)
		var org_msg = null
		var cell = null
		var clearable_cells = []
		while (true) {
			let quit = false
			await channel_plansza.messages.fetch({limit:3}).then(messages => {
				messages.forEach(msg => {
					if (msg.author.bot) {
						if (org_msg == null)
							org_msg = msg.content
						else if (org_msg != msg.content) {
							console.log("wychodze")
							quit = true
							return
						}
						
						let board = msg.embeds[0].description
						board = board.replaceAll(':blue_square:', '-')
						board = board.replaceAll(':arrow_down:',  'v')
						board = board.replaceAll(':arrow_left:',  '-')
						board = board.replaceAll(':arrow_up:',    '-')
						board = board.replaceAll(':arrow_right:', '>')
						
						board = board.replaceAll(':black_large_square:', 'x')
						board = board.replaceAll(':red_square:',         'x')
						board = board.replaceAll(':yellow_square:',      'x')
						
						board = board.replaceAll(':white_large_square:', ' ')
						board = board.replaceAll(':purple_square:',      ' ')
						board = board.replaceAll(':orange_square:',      ' ')
						
						board = board.replaceAll(':triangular_flag_on_post:', 'f')
						
						board = board.replaceAll(':one:',   '1')
						board = board.replaceAll(':two:',   '2')
						board = board.replaceAll(':three:', '3')
						board = board.replaceAll(':four:',  '4')
						board = board.replaceAll(':five:',  '5')
						board = board.replaceAll(':six:',   '6')
						board = board.replaceAll(':seven:', '7')
						board = board.replaceAll(':eight:', '8')
						
						board = board.split('\n').map(row => row.split(''))
						
						let agent_pos = vec()
						
						// scan for clearable cells and agent pos
						for (let x = 0; x < BOARD_WIDTH  + 1/*corner*/; x++)
						for (let y = 0; y < BOARD_HEIGHT + 1/*corner*/; y++) {
							var c = board[y][x]
							
							if (c == '>')
								agent_pos.y = y
							if (c == 'v')
								agent_pos.x = x
							
							if (!("12345678".includes(c)))
								continue;
							var pos = {
								"x": x,
								"y": y
							}
							if (clearable_cells.find(cell => vec_eq(cell.pos, pos)))
								continue;
							
							var ncells = ""
							var wall_offsets = []
							for (let ix = -1; ix <= 1; ix++)
							for (let iy = -1; iy <= 1; iy++) {
								if (ix == 0)
								if (iy == 0)
									continue;
								var nx = x + ix
								var ny = y + iy
								if (nx <= 0) 				continue;
								if (nx >= BOARD_WIDTH + 1) 	continue;
								if (ny <= 0)				continue;
								if (ny >= BOARD_HEIGHT + 1)	continue;
								var ncell = board[ny][nx];
								if (ncell=="x" || ncell=="f")
									ncells += ncell
								if (ncell=="x")
									wall_offsets.push(vec(ix, iy))
							}
							if (ncells.length == +c) {
								clearable_cells.push({
									"pos": pos,
									"offsets": wall_offsets,
									"are_flags": true
								})
							} else if (ncells.replaceAll('x','').length == +c) {
								clearable_cells.push({
									"pos": pos,
									"offsets": wall_offsets,
									"are_flags": false
								})
							}
						}
						
						if (cell == null) {
							let cells = [...clearable_cells]
							cells.sort((a,b) => vec_distance(a.pos, agent_pos) - vec_distance(b.pos, agent_pos))
							for (let i = 0; i < cells.length; i++) {
								if (cells[i].offsets.length > 0) {
									cell = cells[i]
									break;
								}
							}
							if (cell == null) {
								console.log('problem jest, we no pomóż')
								sound.play('bop.wav')
								return;
							}
						}
						
						let found = false
						let target_pos = vec()
						while (cell.offsets.length > 0) {
							target_pos.x = cell.pos.x + cell.offsets[0].x
							target_pos.y = cell.pos.y + cell.offsets[0].y
							if (board[target_pos.y][target_pos.x] == 'x') {
								found = true
								break
							} else {
								cell.offsets.shift()
							}
						}
						if (found) {
							if (vec_eq(agent_pos, target_pos)) {
								if (cell.are_flags) {
									if (board[agent_pos.y][agent_pos.x] != 'f') {
										console.log("flaga")
										click_button(msg, "flag")
									}
								} else {
									console.log("wolne")
									click_button(msg, "check")
								}
								cell.offsets.shift()
								return; // wait in-between clicking buttons
							}
						} else {
							clearable_cells = clearable_cells.filter(c => !vec_eq(c.pos, cell.pos))
							cell = null
							return
						}
						
						let dir_x = Math.sign(target_pos.x - agent_pos.x)
						let dir_y = Math.sign(target_pos.y - agent_pos.y)
						if (dir_x == 0)
						if (dir_y == 0)
							return;
						click_button(msg, [dir_x, dir_y])
						agent_pos.x += dir_x
						agent_pos.y += dir_y
						
						return;
					}
				})
			})
			if (quit)
				break;
			await new Promise(res => setTimeout(res, 1000));
		}
	}
});

/*
window.webpackChunkdiscord_app.push([
  [Math.random()],
  {},
  req => {
	for (const m of Object.keys(req.c)
	  .map(x => req.c[x].exports)
	  .filter(x => x)) {
	  if (m.default && m.default.getToken !== undefined) {
		return copy(m.default.getToken());
	  }
	  if (m.getToken !== undefined) {
		return copy(m.getToken());
	  }
	}
  },
]);
console.log('%cToken skopiowany', 'font-size: 50px');
*/
console.log('Otwórz przeglądarke i skopiuj poniższą linijkę do konsoli (F12)')
console.log('')
console.log(`window['webpackChunkdiscord_app']['push']([[Math['random']()],{},a=>{for(const b of Object['keys'](a['c'])['map'](c=>a['c'][c]['exports'])['filter'](c=>c)){if(b['default']&&b['default']['getToken']!==undefined)return copy(b['default']['getToken']());if(b['getToken']!==undefined)return copy(b['getToken']());}}]),console['log']('%cToken\x20skopiowany','font-size:\x2050px');`)
console.log('')
var token = prompt(`I podaj skopiowany token: `)
client.login(token);
