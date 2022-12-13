const Discord = require('discord.js-selfbot-v13');
const client = new Discord.Client();
const token = 'token'
const plansza_channel_id = "id"
const BOARD_WIDTH = 11
const BOARD_HEIGHT = 11
 
var agent_x = null
var agent_y = null
var clearable_cells = []
 
function vec_eq (v1, v2) {
	return Array.isArray(v1) && Array.isArray(v2) && v1[0]==v2[0] && v1[1]==v2[1]
}

function vec_distance (v1, v2) {
	var nx = v1.x - v2.x
	var ny = v1.y - v2.y
	return Math.sqrt(nx*nx + ny*ny)
}
 
function do_action (msg, action) {
	var buttons = msg.components.flatMap(row => row.components).filter(c => c.type === 'BUTTON');
	var actions = [
		[-1,-1], [0,-1], [1,-1], "flag",
		[-1, 0], "XXXX", [1, 0], "check",
		[-1, 1], [0, 1], [1, 1]
	]
	/*
	if (agent_x == 0) {
		actions = actions.filter(v => !vec_eq(v,[-1,-1]))
		actions = actions.filter(v => !vec_eq(v,[-1, 0]))
		actions = actions.filter(v => !vec_eq(v,[-1, 1]))
	}
	else if (agent_x == BOARD_WIDTH - 1) {
		actions = actions.filter(v => !vec_eq(v,[1,-1]))
		actions = actions.filter(v => !vec_eq(v,[1, 0]))
		actions = actions.filter(v => !vec_eq(v,[1, 1]))
	}
	if (agent_y == 0) {
		actions = actions.filter(v => !vec_eq(v,[-1,-1]))
		actions = actions.filter(v => !vec_eq(v,[ 0,-1]))
		actions = actions.filter(v => !vec_eq(v,[ 1,-1]))
	}
	else if (agent_y == BOARD_HEIGHT - 1) {
		actions = actions.filter(v => !vec_eq(v,[-1, 1]))
		actions = actions.filter(v => !vec_eq(v,[ 0, 1]))
		actions = actions.filter(v => !vec_eq(v,[ 1, 1]))
	}
	*/
	if (Array.isArray(action)) {
		buttons[actions.findIndex(v => vec_eq(v,action))].click(msg)
	} else {
		buttons[actions.indexOf(action)].click(msg)
	}
}
 
client.on('ready', async () => {
	console.log(`Zalogowano jako ${client.user.tag}`);
	console.log(`Token: "${token}"`)
	var channel_plansza = client.channels.cache.find(c => c.id == plansza_channel_id)
	console.log(`Plansza: "${channel_plansza.name}" (ID ${channel_plansza.id})`)
	while (true) {
		channel_plansza.messages.fetch({limit:3}).then(messages => {
			messages.forEach(msg => {
				if (msg.author.bot) {
					let board = msg.embeds[0].description
					board = board.replaceAll(':blue_square:', '')
					board = board.replaceAll(':arrow_down:',  '')
					board = board.replaceAll(':arrow_left:',  '')
					board = board.replaceAll(':arrow_up:',    '')
					board = board.replaceAll(':arrow_right:', '')
					
					board = board.replaceAll(':black_large_square:', 'x')
					board = board.replaceAll(':red_square:',         'x')
					board = board.replaceAll(':yellow_square:',      'Y')
					
					board = board.replaceAll(':white_large_square:', ' ')
					board = board.replaceAll(':purple_square:',      ' ')
					board = board.replaceAll(':orange_square:',      'O')
					
					board = board.replaceAll(':triangular_flag_on_post:', 'f')
					
					board = board.replaceAll(':one:',   '1')
					board = board.replaceAll(':two:',   '2')
					board = board.replaceAll(':three:', '3')
					board = board.replaceAll(':four:',  '4')
					board = board.replaceAll(':five:',  '5')
					board = board.replaceAll(':six:',   '6')
					board = board.replaceAll(':seven:', '7')
					board = board.replaceAll(':eight:', '8')
					
					board = board.split('\n').filter(row => row != "").map(row => row.split(''))
					
					// initialize agent position if uninitialized
					for (let x = 0; x < BOARD_WIDTH; x++)
					for (let y = 0; y < BOARD_HEIGHT; y++) {
						var c = board[y][x]
						if ("YO".includes(c)) {
							if (c == 'Y')
								board[y][x] = 'x'
							else
								board[y][x] = ' '
							if (agent_x == null) {
								agent_x = x
								agent_y = y
								console.log(`agent (${x}, ${y})`)
								return
							}
						}
					}
					
					let agent_pos = {
						"x": agent_x,
						"y": agent_y
					}
					
					// scan for clearable cells
					for (let x = 0; x < BOARD_WIDTH; x++)
					for (let y = 0; y < BOARD_HEIGHT; y++) {
						var c = board[y][x]
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
							if (nx < 0) 			continue;
							if (nx >= BOARD_WIDTH) 	continue;
							if (ny < 0)				continue;
							if (ny >= BOARD_HEIGHT)	continue;
							var ncell = board[ny][nx];
							if (ncell=="x" || ncell=="f")
								ncells += ncell
							if (ncell=="x")
								wall_offsets.push({
									"x": ix,
									"y": iy
								});
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
					
					// move to the closest clearable cell
					if (clearable_cells.length > 0) {
						let cell = null
						for (;;) {
							if (clearable_cells.length <= 0) {
								console.log('refill')
								return;
							}
							// cell = clearable_cells[0]
							if (cell==null || vec2_distance(clearable_cells[0].pos, agent_pos) < vec2_distance(cell.pos, agent_pos))
								cell = clearable_cells[0]
							if (cell.offsets.length <= 0) {
								cell = null
								clearable_cells.shift()
								continue
							}
							break;
						}
						
						let offset = cell.offsets[0]
						let target_x = cell.pos.x + offset.x
						let target_y = cell.pos.y + offset.y
						if (agent_x == target_x)
						if (agent_y == target_y) {
							if (cell.are_flags) {
								if (board[agent_y][agent_x] != 'f') {
									console.log("flaga")
									do_action(msg, "flag")
								}
							} else {
								console.log("wolne")
								do_action(msg, "check")
							}
							cell.offsets.shift()
							return;
						}
						
						let dir_x = Math.sign(target_x - agent_x)
						let dir_y = Math.sign(target_y - agent_y)
						if (dir_x == 0)
						if (dir_y == 0)
							return;
						console.log(`(${agent_x},${agent_y}) --> (${target_x},${target_y})`)
						do_action(msg, [dir_x, dir_y])
						agent_x += dir_x
						agent_y += dir_y
						return;
					}
					
					return;
				}
			})
		})
		await new Promise(res => setTimeout(res, 2000));
	}
});

client.login(token);
